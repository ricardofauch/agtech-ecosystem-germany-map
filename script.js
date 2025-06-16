/**
 * AgTech Ecosystem Map Application
 * 
 * A comprehensive interactive map and data visualization tool for the German AgTech ecosystem.
 * Features include interactive mapping, filtering, and detailed organization views.
 * 
 * @author ricardofauch
 * @version 2.0.0
 * @requires Leaflet.js, Leaflet.markercluster, PapaParse
 */

(function () {
    'use strict';

    /**
     * Configuration object containing all app settings
     */
    const CONFIG = {
        // Data source configuration
        data: {
            csvUrl: 'agtech-ecosystem-data.csv',
            delimiter: ';',
            encoding: 'UTF-8'
        },

        // Map configuration
        map: {
            center: [51.1657, 10.4515],
            zoom: {
                default: 6,
                mobile: 5
            },
            tileLayer: {
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '© OpenStreetMap contributors'
            }
        },

        // Cluster configuration
        cluster: {
            maxRadius: 40,
            showCoverageOnHover: false,
            spiderfyOnMaxZoom: false,
            zoomToBoundsOnClick: true
        },

        // Performance settings
        performance: {
            debounceDelay: 300,
            maxTableRows: 1000,
            virtualScrollThreshold: 500
        }
    };

    /**
     * Color schemes for different organization types and categories
     */
    const COLOR_SCHEMES = {
        types: {
            'Startup': '#00CD6C',
            'Accelerator': '#F28522',
            'Incubator': '#FFC61E',
            'Forschungsinstitut': '#AF58BA',
            'Netzwerk': '#009ADE',
            'Förderprogramm': '#FF1F5B',
            'Micro VC': '#A0B1BA',
            'Venture Capital': '#4e5559',
            'Beratungsunternehmen': '#A6761D'
        },
        categories: {
            'Farm Management, Sensorik und IoT': '#1a936f',
            'Roboter und Mechanisierung': '#2A9D8F',
            'Ag Biotechnologien und Biomaterialien': '#88529F',
            'Neue Produktionssysteme': '#E76F51',
            'Marktplätze und Handel': '#457B9D',
            'Innovative Food Technologien': '#8C1C13',
            'Supply Chain Technologien': '#344E41'
        }
    };

    /**
     * Main application class that orchestrates all components
     */
    class AgTechMapApp {
        /**
         * Initialize the application
         */
        constructor() {
            this.data = null;
            this.map = null;
            this.markerCluster = null;
            this.locationGroups = new Map();
            this.activeFilters = {
                type: null,
                categories: new Set()
            };

            // Component instances
            this.mapComponent = null;
            this.filterComponent = null;
            this.tableComponent = null;
            this.detailComponent = null;

            // Initialize the application
            this.init();
        }

        /**
         * Initialize application components and load data
         */
        async init() {
            try {
                this.showLoading(true);

                // Initialize components
                this.initializeComponents();

                // Load and process data
                await this.loadData();

                // Setup event listeners
                this.setupEventListeners();

                this.showLoading(false);

                console.log('AgTech Map Application initialized successfully');
            } catch (error) {
                this.handleError(error);
            }
        }

        /**
         * Initialize all application components
         */
        initializeComponents() {
            this.mapComponent = new MapComponent(this);
            this.filterComponent = new FilterComponent(this);
            this.tableComponent = new TableComponent(this);
            this.detailComponent = new DetailComponent(this);
        }

        /**
         * Load data from CSV file with error handling
         * @returns {Promise<void>}
         */
        async loadData() {
            return new Promise((resolve, reject) => {
                Papa.parse(CONFIG.data.csvUrl, {
                    download: true,
                    header: true,
                    delimiter: CONFIG.data.delimiter,
                    skipEmptyLines: true,
                    encoding: CONFIG.data.encoding,
                    complete: (results) => {
                        if (results.errors.length > 0) {
                            console.warn('CSV parsing warnings:', results.errors);
                        }

                        this.data = this.validateAndCleanData(results.data);
                        this.processLocationGroups();

                        // Initialize components with data
                        this.mapComponent.addMarkers(this.locationGroups);
                        this.filterComponent.initialize(this.data);
                        this.tableComponent.initialize(this.data);

                        resolve();
                    },
                    error: (error) => {
                        reject(new Error(`Fehler beim Laden der CSV-Datei: ${error.message}`));
                    }
                });
            });
        }

        /**
         * Validate and clean the loaded data
         * @param {Array} rawData - Raw data from CSV
         * @returns {Array} Cleaned and validated data
         */
        validateAndCleanData(rawData) {
            return rawData.filter(org => {
                // Basic validation
                if (!org.OrganizationName || org.OrganizationName.trim() === '') {
                    return false;
                }

                // Clean and normalize data
                org.OrganizationName = org.OrganizationName.trim();
                org.OrganizationType = org.OrganizationType || 'Startup';
                org.FinalCategories = org.FinalCategories || '';
                org.Headquarter = org.Headquarter || org.Headquater || '';
                org.WebsiteUrl = org.WebsiteUrl ? org.WebsiteUrl.trim() : '';
                org.AiSummary = org.AiSummary || '';

                // Parse coordinates
                org.latitude = this.parseCoordinate(org.Latitude);
                org.longitude = this.parseCoordinate(org.Longitude);

                return true;
            });
        }

        /**
         * Parse coordinate string to float
         * @param {string} coord - Coordinate string
         * @returns {number|null} Parsed coordinate or null if invalid
         */
        parseCoordinate(coord) {
            if (!coord) return null;
            const cleaned = coord.toString().replace(',', '.');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? null : parsed;
        }

        /**
         * Group organizations by their coordinates
         */
        processLocationGroups() {
            this.locationGroups.clear();

            this.data.forEach(org => {
                if (org.latitude !== null && org.longitude !== null) {
                    const key = `${org.latitude},${org.longitude}`;

                    if (!this.locationGroups.has(key)) {
                        this.locationGroups.set(key, []);
                    }

                    this.locationGroups.get(key).push(org);
                }
            });
        }

        /**
         * Setup global event listeners
         */
        setupEventListeners() {
            // Navigation between map and table
            document.getElementById('agtech-back-to-map')?.addEventListener('click', () => {
                this.scrollToElement('agtech-app');
            });

            // Window resize handler with debouncing
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    this.mapComponent.handleResize();
                }, CONFIG.performance.debounceDelay);
            });

            // Filter toggle for mobile
            const filterToggle = document.getElementById('agtech-filter-toggle');
            if (filterToggle) {
                filterToggle.addEventListener('click', () => {
                    this.filterComponent.toggleMobileFilters();
                });
            }
        }

        /**
         * Show or hide loading indicator
         * @param {boolean} show - Whether to show loading
         */
        showLoading(show) {
            const loading = document.getElementById('agtech-loading');
            if (loading) {
                loading.style.display = show ? 'flex' : 'none';
            }
        }

        /**
         * Handle application errors
         * @param {Error} error - The error to handle
         */
        handleError(error) {
            console.error('AgTech Map Error:', error);

            const errorHTML = `
                <div class="agtech-error">
                    <h3>Fehler beim Laden der Anwendung</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()">Seite neu laden</button>
                </div>
            `;

            document.getElementById('agtech-app').innerHTML = errorHTML;
            this.showLoading(false);
        }

        /**
         * Smooth scroll to element
         * @param {string} elementId - ID of element to scroll to
         */
        scrollToElement(elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }

        /**
         * Update active filters and refresh views
         * @param {Object} filters - New filter state
         */
        updateFilters(filters) {
            this.activeFilters = { ...filters };
            this.tableComponent.applyFilters(this.activeFilters);
        }

        /**
         * Get color for organization type
         * @param {string} type - Organization type
         * @returns {string} Color hex code
         */
        getTypeColor(type) {
            return COLOR_SCHEMES.types[type] || COLOR_SCHEMES.types['Startup'];
        }

        /**
         * Get color for organization category
         * @param {string} category - Organization category
         * @returns {string} Color hex code
         */
        getCategoryColor(category) {
            return COLOR_SCHEMES.categories[category] || '#999';
        }
    }


    /**
     * Map component handling all map-related functionality
     * Includes mobile-optimized features and touch interactions
     */
    class MapComponent {
        /**
         * Initialize MapComponent
         * @param {AgTechMapApp} app - Reference to main app
         */
        constructor(app) {
            this.app = app;
            this.map = null;
            this.markerCluster = null;
            this.legend = null;
            this.isInitialized = false;
            
            // Mobile detection
            this.isMobile = () => window.innerWidth <= 768;
            this.isTouch = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            
            // Initialize map
            this.initializeMap();
            this.createLegend();
            this.addMapControls();
            this.setupEventListeners();
            
            this.isInitialized = true;
        }

        /**
         * Initialize the Leaflet map with mobile-optimized settings
         */
        initializeMap() {
            const mapContainer = document.getElementById('agtech-map');
            if (!mapContainer) {
                throw new Error('Map container element not found');
            }

            // Mobile-optimized map options
            const mapOptions = {
                zoomControl: false, // We'll add custom zoom control
                scrollWheelZoom: true,
                doubleClickZoom: true,
                dragging: true,
                touchZoom: this.isTouch(),
                tap: this.isTouch(),
                tapTolerance: this.isMobile() ? 20 : 15, // Higher tolerance for mobile
                keyboard: true,
                keyboardZoomOffset: 1,
                wheelDebounceTime: 60,
                wheelPxPerZoomLevel: 60,
                zoomSnap: this.isMobile() ? 0.5 : 1, // Smoother zoom on mobile
                zoomDelta: this.isMobile() ? 0.5 : 1,
                trackResize: true
            };

            try {
                this.map = L.map('agtech-map', mapOptions)
                    .setView(CONFIG.map.center, this.getInitialZoom());
            } catch (error) {
                console.error('Failed to initialize map:', error);
                throw new Error('Map initialization failed');
            }

            // Add custom zoom control
            this.addZoomControl();

            // Add tile layer with error handling
            this.addTileLayer();

            // Initialize marker cluster group with mobile-optimized settings
            this.initializeMarkerCluster();

            // Store reference in app
            this.app.map = this.map;
            this.app.markerCluster = this.markerCluster;

            console.log('Map initialized successfully');
        }

        /**
         * Add custom zoom control with mobile-friendly positioning
         */
        addZoomControl() {
            const zoomPosition = this.isMobile() ? 'topright' : 'topleft';
            
            L.control.zoom({
                position: zoomPosition,
                zoomInText: '+',
                zoomOutText: '−',
                zoomInTitle: 'Hineinzoomen',
                zoomOutTitle: 'Herauszoomen'
            }).addTo(this.map);
        }

        /**
         * Add tile layer with fallback options
         */
        addTileLayer() {
            const primaryTileLayer = L.tileLayer(CONFIG.map.tileLayer.url, {
                attribution: CONFIG.map.tileLayer.attribution,
                maxZoom: 18,
                minZoom: 3,
                tileSize: 256,
                zoomOffset: 0,
                detectRetina: true,
                crossOrigin: true
            });

            // Fallback tile layer
            const fallbackTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap France',
                maxZoom: 18,
                minZoom: 3
            });

            // Add primary layer with error handling
            primaryTileLayer.on('tileerror', (error) => {
                console.warn('Tile loading error, switching to fallback:', error);
                this.map.removeLayer(primaryTileLayer);
                fallbackTileLayer.addTo(this.map);
            });

            primaryTileLayer.addTo(this.map);
        }

        /**
         * Initialize marker cluster group with mobile optimizations
         */
        initializeMarkerCluster() {
            const clusterOptions = {
                ...CONFIG.cluster,
                maxClusterRadius: this.isMobile() ? 60 : CONFIG.cluster.maxRadius,
                spiderfyOnMaxZoom: !this.isMobile(), // Disable spiderfy on mobile
                zoomToBoundsOnClick: true,
                showCoverageOnHover: !this.isMobile(),
                iconCreateFunction: (cluster) => this.createClusterIcon(cluster),
                // Mobile-specific cluster options
                disableClusteringAtZoom: this.isMobile() ? 15 : null,
                maxZoom: 18,
                animate: !this.isMobile() || !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                animateAddingMarkers: false, // Disable for better performance
                chunkedLoading: true,
                chunkDelay: 200,
                chunkInterval: 200,
                chunkProgress: (processed, total, elapsed) => {
                    if (this.app.showLoading && processed < total) {
                        // Optional: Update loading progress
                        console.log(`Loading markers: ${processed}/${total}`);
                    }
                }
            };

            this.markerCluster = L.markerClusterGroup(clusterOptions);
            this.map.addLayer(this.markerCluster);

            // Setup cluster event handlers
            this.setupClusterEvents();
        }

        /**
         * Setup event listeners for the map
         */
        setupEventListeners() {
            // Window resize handler
            window.addEventListener('resize', this.debounce(() => {
                this.handleResize();
            }, 250));

            // Orientation change for mobile
            if (this.isMobile()) {
                window.addEventListener('orientationchange', () => {
                    setTimeout(() => {
                        this.handleResize();
                        this.adjustForOrientation();
                    }, 100);
                });
            }

            // Map loading events
            this.map.on('load', () => {
                console.log('Map loaded successfully');
            });

            this.map.on('zoomend', () => {
                this.onZoomEnd();
            });

            // Mobile-specific touch events
            if (this.isTouch()) {
                this.setupTouchEvents();
            }
        }

        /**
         * Setup cluster-specific event handlers
         */
        setupClusterEvents() {
            // Cluster click handler
            this.markerCluster.on('clusterclick', (event) => {
                const childMarkers = event.layer.getAllChildMarkers();
                const allOrgs = childMarkers.reduce((acc, marker) => 
                    acc.concat(marker.organizationData || []), []);
                
                if (allOrgs.length === 0) return;

                // Determine location name for cluster
                const location = this.determineClusterLocation(allOrgs);
                
                // Show detail panel
                this.app.detailComponent.show(allOrgs, location);

                // Analytics/tracking (optional)
                this.trackEvent('cluster_click', {
                    organization_count: allOrgs.length,
                    location: location
                });
            });

            // Cluster mouse events (desktop only)
            if (!this.isMobile()) {
                this.markerCluster.on('clustermouseover', (event) => {
                    const childMarkers = event.layer.getAllChildMarkers();
                    const count = childMarkers.length;
                    
                    // Optional: Show tooltip with count
                    event.layer.bindTooltip(`${count} Organisationen`, {
                        permanent: false,
                        direction: 'top'
                    }).openTooltip();
                });
            }
        }

        /**
         * Setup touch-specific event handlers for mobile
         */
        setupTouchEvents() {
            let touchStartTime = 0;
            let touchMoved = false;

            this.map.on('touchstart', () => {
                touchStartTime = Date.now();
                touchMoved = false;
            });

            this.map.on('touchmove', () => {
                touchMoved = true;
            });

            this.map.on('touchend', (event) => {
                const touchDuration = Date.now() - touchStartTime;
                
                // Long press detection (500ms)
                if (!touchMoved && touchDuration > 500) {
                    this.handleLongPress(event);
                }
            });
        }

        /**
         * Handle long press on mobile maps
         * @param {Object} event - Touch event
         */
        handleLongPress(event) {
            const { lat, lng } = event.latlng;
            
            // Optional: Show context menu or location info
            console.log('Long press detected at:', lat, lng);
            
            // Could add functionality like "Add marker here" or "Get directions"
        }

        /**
         * Get initial zoom level based on screen size and device
         * @returns {number} Zoom level
         */
        getInitialZoom() {
            if (this.isMobile()) {
                return window.innerHeight > window.innerWidth ? 
                    CONFIG.map.zoom.mobile : CONFIG.map.zoom.mobile + 1; // Landscape gets slightly more zoom
            }
            return CONFIG.map.zoom.default;
        }

        /**
         * Handle window resize events
         */
        handleResize() {
            if (!this.map || !this.isInitialized) return;

            try {
                // Invalidate map size
                this.map.invalidateSize(true);
                
                // Adjust zoom for mobile if needed
                if (this.isMobile()) {
                    const currentZoom = this.map.getZoom();
                    const targetZoom = this.getInitialZoom();
                    
                    if (Math.abs(currentZoom - targetZoom) > 1) {
                        this.map.setZoom(targetZoom, { animate: false });
                    }
                }
                
                // Re-cluster markers if cluster radius changed
                if (this.markerCluster) {
                    this.markerCluster.refreshClusters();
                }
                
                console.log('Map resized successfully');
            } catch (error) {
                console.error('Error during map resize:', error);
            }
        }

        /**
         * Adjust map for orientation changes
         */
        adjustForOrientation() {
            if (!this.isMobile()) return;

            const isLandscape = window.innerWidth > window.innerHeight;
            
            // Adjust map height if needed
            const mapElement = document.getElementById('agtech-map');
            if (mapElement) {
                const newHeight = isLandscape ? '80vh' : '60vh';
                mapElement.style.height = newHeight;
            }

            // Re-invalidate size after height change
            setTimeout(() => {
                this.map.invalidateSize(true);
            }, 100);
        }

        /**
         * Handle zoom end events
         */
        onZoomEnd() {
            const currentZoom = this.map.getZoom();
            
            // Hide legend on high zoom levels on mobile
            if (this.isMobile() && this.legend) {
                const shouldHideLegend = currentZoom > 12;
                this.toggleLegend(!shouldHideLegend);
            }

            // Optional: Adjust marker sizes based on zoom
            this.adjustMarkersForZoom(currentZoom);
        }

        /**
         * Adjust marker appearance based on zoom level
         * @param {number} zoomLevel - Current zoom level
         */
        adjustMarkersForZoom(zoomLevel) {
            // Could implement dynamic marker sizing here
            // For now, we'll just log the zoom level
            console.log('Zoom level changed to:', zoomLevel);
        }

        /**
         * Create custom cluster icon
         * @param {Object} cluster - Leaflet cluster object
         * @returns {Object} Leaflet DivIcon
         */
        createClusterIcon(cluster) {
            const childMarkers = cluster.getAllChildMarkers();
            const allOrgs = childMarkers.reduce((acc, marker) => 
                acc.concat(marker.organizationData || []), []);
            
            return this.createCustomMarker(allOrgs);
        }

        /**
         * Create custom marker icon based on organizations
         * @param {Array} organizations - Organizations at this location
         * @returns {Object} Leaflet DivIcon
         */
        createCustomMarker(organizations) {
            const count = organizations.length;
            const isMobile = this.isMobile();
            
            // Mobile: Smaller markers for better touch interaction
            const baseSize = isMobile ? 
                Math.max(28, Math.min(65, 28 + Math.sqrt(count) * 5)) :
                Math.max(32, Math.min(75, 32 + Math.sqrt(count) * 6));
                
            const radius = baseSize / 2;
            const innerRadius = radius * 0.65;
            const center = baseSize / 2;

            // Determine dominant organization type
            const typeCount = organizations.reduce((acc, org) => {
                const type = org.OrganizationType || 'Startup';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});

            const dominantType = Object.entries(typeCount)
                .sort((a, b) => b[1] - a[1])[0][0];

            // Create segments for other types
            const otherTypes = { ...typeCount };
            delete otherTypes[dominantType];
            
            const segments = this.calculateSegments(otherTypes, innerRadius, radius, center);
            const svgPaths = this.generateSegmentPaths(segments);

            // Generate SVG with accessibility attributes
            const svg = `
                <svg width="${baseSize}" height="${baseSize}" 
                    viewBox="0 0 ${baseSize} ${baseSize}"
                    role="img"
                    aria-label="${count} Organisationen in diesem Bereich">
                    <title>${count} Organisationen</title>
                    <circle cx="${center}" cy="${center}" r="${innerRadius}"
                        fill="${this.app.getTypeColor(dominantType)}"
                        stroke="white" stroke-width="2"/>
                    ${svgPaths}
                    <text x="${center}" y="${center}" text-anchor="middle"
                        dominant-baseline="middle" fill="white" font-weight="bold"
                        font-size="${Math.max(10, baseSize / 3.5)}px"
                        font-family="Arial, sans-serif">
                        ${count}
                    </text>
                </svg>
            `;

            return L.divIcon({
                html: svg,
                className: 'agtech-custom-marker',
                iconSize: [baseSize, baseSize],
                iconAnchor: [baseSize / 2, baseSize / 2],
                popupAnchor: [0, -baseSize / 2]
            });
        }

        /**
         * Calculate segment positions for multi-type markers
         * @param {Object} otherTypes - Type counts excluding dominant type
         * @param {number} innerRadius - Inner radius
         * @param {number} radius - Outer radius
         * @param {number} center - Center point
         * @returns {Array} Segment configurations
         */
        calculateSegments(otherTypes, innerRadius, radius, center) {
            const segments = [];
            const totalOthers = Object.values(otherTypes).reduce((sum, n) => sum + n, 0);
            
            if (totalOthers === 0) return segments;
            
            let startAngle = 0;
            for (const [type, value] of Object.entries(otherTypes)) {
                const angle = (value / totalOthers) * 360;
                segments.push({
                    type,
                    startAngle,
                    endAngle: startAngle + angle,
                    innerRadius,
                    radius,
                    center
                });
                startAngle += angle;
            }
            
            return segments;
        }

        /**
         * Generate SVG paths for segments
         * @param {Array} segments - Segment configurations
         * @returns {string} SVG path strings
         */
        generateSegmentPaths(segments) {
            return segments.map(segment => {
                const { type, startAngle, endAngle, innerRadius, radius, center } = segment;
                
                // Skip very small segments (< 10 degrees)
                if (endAngle - startAngle < 10) return '';
                
                const startRad = (startAngle - 90) * Math.PI / 180;
                const endRad = (endAngle - 90) * Math.PI / 180;
                
                const innerX1 = center + innerRadius * Math.cos(startRad);
                const innerY1 = center + innerRadius * Math.sin(startRad);
                const innerX2 = center + innerRadius * Math.cos(endRad);
                const innerY2 = center + innerRadius * Math.sin(endRad);
                
                const outerX1 = center + radius * Math.cos(startRad);
                const outerY1 = center + radius * Math.sin(startRad);
                const outerX2 = center + radius * Math.cos(endRad);
                const outerY2 = center + radius * Math.sin(endRad);
                
                const largeArc = (endAngle - startAngle > 180) ? 1 : 0;

                return `<path d="M ${innerX1.toFixed(1)} ${innerY1.toFixed(1)} 
                            L ${outerX1.toFixed(1)} ${outerY1.toFixed(1)} 
                            A ${radius} ${radius} 0 ${largeArc} 1 ${outerX2.toFixed(1)} ${outerY2.toFixed(1)} 
                            L ${innerX2.toFixed(1)} ${innerY2.toFixed(1)} 
                            A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerX1.toFixed(1)} ${innerY1.toFixed(1)} Z"
                        fill="${this.app.getTypeColor(type)}"
                        stroke="white"
                        stroke-width="1"/>`;
            }).join('');
        }

        /**
         * Determine location name for cluster
         * @param {Array} organizations - Organizations in cluster
         * @returns {string} Location name
         */
        determineClusterLocation(organizations) {
            let location = "verschiedenen Standorten";
            
            if (organizations.length > 0) {
                const locationCount = {};
                organizations.forEach(org => {
                    if (org.Headquarter) {
                        locationCount[org.Headquarter] = (locationCount[org.Headquarter] || 0) + 1;
                    }
                });

                const mostCommon = Object.entries(locationCount)
                    .sort((a, b) => b[1] - a[1])[0];
                
                if (mostCommon && mostCommon[1] > 1) {
                    location = mostCommon[0] + " und Umgebung";
                } else if (mostCommon) {
                    location = mostCommon[0];
                }
            }
            
            return location;
        }

        /**
         * Add markers to the map
         * @param {Map} locationGroups - Map of coordinates to organizations
         */
        addMarkers(locationGroups) {
            if (!this.markerCluster) {
                console.error('Marker cluster not initialized');
                return;
            }

            // Clear existing markers
            this.markerCluster.clearLayers();

            let markersAdded = 0;
            const totalMarkers = locationGroups.size;

            locationGroups.forEach((orgs, coords) => {
                try {
                    const [lat, lng] = coords.split(',').map(Number);
                    
                    // Validate coordinates
                    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                        console.warn('Invalid coordinates:', coords);
                        return;
                    }
                    
                    const marker = L.marker([lat, lng], {
                        icon: this.createCustomMarker(orgs),
                        alt: `${orgs.length} Organisationen`,
                        keyboard: true,
                        riseOnHover: true
                    });

                    // Store organization data
                    marker.organizationData = orgs;
                    
                    // Add click event with proper context
                    marker.on('click', (event) => {
                        const location = orgs[0]?.Headquarter || 'diesem Standort';
                        this.app.detailComponent.show(orgs, location);
                        
                        // Track marker click
                        this.trackEvent('marker_click', {
                            organization_count: orgs.length,
                            location: location,
                            coordinates: coords
                        });
                    });

                    // Add keyboard support
                    marker.on('keypress', (event) => {
                        if (event.originalEvent.key === 'Enter' || event.originalEvent.key === ' ') {
                            marker.fire('click');
                        }
                    });

                    // Add to cluster
                    this.markerCluster.addLayer(marker);
                    markersAdded++;
                    
                } catch (error) {
                    console.error('Error adding marker at coordinates:', coords, error);
                }
            });

            console.log(`Added ${markersAdded}/${totalMarkers} markers to map`);
            
            // Fit map to markers if we have any
            if (markersAdded > 0) {
                setTimeout(() => {
                    try {
                        const group = new L.featureGroup(this.markerCluster.getLayers());
                        if (group.getBounds().isValid()) {
                            this.map.fitBounds(group.getBounds(), {
                                padding: this.isMobile() ? [20, 20] : [50, 50],
                                maxZoom: this.isMobile() ? 10 : 12
                            });
                        }
                    } catch (error) {
                        console.warn('Could not fit bounds to markers:', error);
                    }
                }, 100);
            }
        }

        /**
         * Create map legend
         */
        createLegend() {
            const legendControl = L.control({ position: 'bottomright' });
            
            legendControl.onAdd = () => {
                const div = L.DomUtil.create('div', 'agtech-legend');
                div.setAttribute('role', 'complementary');
                div.setAttribute('aria-label', 'Kartenlegende');
                
                let html = '<h4 class="agtech-legend-title">Akteur-Typen</h4>';
                
                Object.entries(COLOR_SCHEMES.types).forEach(([type, color]) => {
                    html += `
                        <div class="agtech-legend-item" role="listitem">
                            <div class="agtech-legend-color" 
                                style="background: ${color}"
                                aria-hidden="true"></div>
                            <span>${type}</span>
                        </div>`;
                });
                
                div.innerHTML = html;
                
                // Prevent map interactions when interacting with legend
                L.DomEvent.disableClickPropagation(div);
                L.DomEvent.disableScrollPropagation(div);
                
                return div;
            };
            
            this.legend = legendControl;
            
            // Only add legend on desktop initially
            if (!this.isMobile()) {
                legendControl.addTo(this.map);
            }
        }

        /**
         * Add map control buttons
         */
        addMapControls() {
            const controlsContainer = L.DomUtil.create('div', 'agtech-map-controls');
            
            // Navigation to table button (desktop only)
            if (!this.isMobile()) {
                const tableButton = L.DomUtil.create('button', 'agtech-control-btn', controlsContainer);
                tableButton.innerHTML = 'Datensatz filtern';
                tableButton.setAttribute('aria-label', 'Zur Datentabelle navigieren');
                tableButton.setAttribute('type', 'button');
                
                tableButton.addEventListener('click', () => {
                    this.app.scrollToElement('agtech-table-section');
                    this.trackEvent('navigation_click', { target: 'table' });
                });

                // Add controls to map
                const mapContainer = document.getElementById('agtech-map');
                if (mapContainer) {
                    mapContainer.appendChild(controlsContainer);
                }
            }
        }

        /**
         * Toggle legend visibility
         * @param {boolean} visible - Whether legend should be visible
         */
        toggleLegend(visible) {
            if (!this.legend) return;
            
            try {
                if (visible && !this.map.hasLayer(this.legend)) {
                    this.legend.addTo(this.map);
                } else if (!visible && this.map.hasLayer(this.legend)) {
                    this.map.removeControl(this.legend);
                }
            } catch (error) {
                console.error('Error toggling legend:', error);
            }
        }

        /**
         * Get current map bounds
         * @returns {Object} Map bounds
         */
        getBounds() {
            return this.map ? this.map.getBounds() : null;
        }

        /**
         * Get current map center
         * @returns {Object} Map center coordinates
         */
        getCenter() {
            return this.map ? this.map.getCenter() : null;
        }

        /**
         * Get current zoom level
         * @returns {number} Current zoom level
         */
        getZoom() {
            return this.map ? this.map.getZoom() : 0;
        }

        /**
         * Pan map to specific coordinates
         * @param {number} lat - Latitude
         * @param {number} lng - Longitude
         * @param {number} zoom - Optional zoom level
         */
        panTo(lat, lng, zoom = null) {
            if (!this.map) return;
            
            try {
                if (zoom !== null) {
                    this.map.setView([lat, lng], zoom);
                } else {
                    this.map.panTo([lat, lng]);
                }
            } catch (error) {
                console.error('Error panning map:', error);
            }
        }

        /**
         * Track events for analytics (optional)
         * @param {string} event - Event name
         * @param {Object} data - Event data
         */
        trackEvent(event, data) {
            // Optional: Integrate with analytics service
            if (window.gtag) {
                window.gtag('event', event, {
                    custom_parameter_1: JSON.stringify(data)
                });
            }
            
            console.log('Map event:', event, data);
        }

        /**
         * Debounce utility function
         * @param {Function} func - Function to debounce
         * @param {number} wait - Wait time in milliseconds
         * @returns {Function} Debounced function
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        /**
         * Destroy map component and cleanup
         */
        destroy() {
            try {
                if (this.markerCluster) {
                    this.markerCluster.clearLayers();
                }
                
                if (this.map) {
                    this.map.remove();
                }
                
                this.map = null;
                this.markerCluster = null;
                this.legend = null;
                this.isInitialized = false;
                
                console.log('MapComponent destroyed successfully');
            } catch (error) {
                console.error('Error destroying MapComponent:', error);
            }
        }
    }

    /**
     * Detail panel component for showing organization information
     */
    class DetailComponent {
        constructor(app) {
            this.app = app;
            this.panel = document.getElementById('agtech-detail-panel');
            this.title = document.getElementById('agtech-detail-title');
            this.counter = document.getElementById('agtech-org-counter');
            this.content = document.getElementById('agtech-detail-content');
            this.infoTooltip = document.getElementById('agtech-info-tooltip');

            this.setupEventListeners();
        }

        setupEventListeners() {
            const closeBtn = document.getElementById('agtech-close-detail');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hide());
            }

            // Touch-Events für Mobile
            if (this.panel) {
                let startY = 0;
                let currentY = 0;
                let isDragging = false;

                // Swipe-to-close für Mobile
                this.panel.addEventListener('touchstart', (e) => {
                    startY = e.touches[0].clientY;
                    isDragging = true;
                }, { passive: true });

                this.panel.addEventListener('touchmove', (e) => {
                    if (!isDragging) return;
                    currentY = e.touches[0].clientY;

                    // Nur nach unten swipen erlauben
                    const deltaY = currentY - startY;
                    if (deltaY > 0) {
                        this.panel.style.transform = `translateY(${deltaY}px)`;
                    }
                }, { passive: true });

                this.panel.addEventListener('touchend', () => {
                    if (!isDragging) return;
                    isDragging = false;

                    const deltaY = currentY - startY;

                    // Wenn mehr als 100px nach unten geswiped, Panel schließen
                    if (deltaY > 100) {
                        this.hide();
                    } else {
                        // Zurück zur ursprünglichen Position
                        this.panel.style.transform = 'translateY(0)';
                    }
                }, { passive: true });
            }

            // Escape-Key Handler
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && this.panel.classList.contains('visible')) {
                    this.hide();
                }
            });
        }

        show(organizations, location) {
            this.updateTitle(organizations.length, location);
            this.renderOrganizations(organizations);

            // Panel anzeigen
            this.panel.classList.add('visible');
            this.panel.scrollTop = 0;
            this.content.scrollTop = 0;

            // Reset transform (falls durch Swipe verändert)
            this.panel.style.transform = 'translateY(0)';

            // Mobile-spezifische Anpassungen
            if (this.isMobile()) {
                // Info-Tooltip verstecken
                if (this.infoTooltip) {
                    this.infoTooltip.style.display = 'none';
                }

                // Body-Scroll verhindern (iOS Safari Fix)
                document.body.style.overflow = 'hidden';

                // Viewport-Meta für bessere Mobile-Darstellung
                this.updateViewportMeta();
            } else {
                // Desktop: Legend verstecken
                if (window.innerWidth >= 768) {
                    this.app.mapComponent.toggleLegend(false);
                }
            }

            // Fokus auf Panel für Accessibility
            this.panel.focus();
        }

        hide() {
            this.panel.classList.remove('visible');
            this.panel.style.transform = 'translateY(0)'; // Reset transform

            // Mobile-spezifische Cleanup
            if (this.isMobile()) {
                // Info-Tooltip wieder anzeigen
                if (this.infoTooltip) {
                    this.infoTooltip.style.display = 'flex';
                }

                // Body-Scroll wieder aktivieren
                document.body.style.overflow = '';
            } else {
                // Desktop: Legend wieder anzeigen
                if (window.innerWidth >= 768) {
                    this.app.mapComponent.toggleLegend(true);
                }
            }
        }

        isMobile() {
            return window.innerWidth <= 768;
        }

        updateViewportMeta() {
            // Viewport-Meta für bessere Mobile-Performance anpassen
            let viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                viewport.setAttribute('content',
                    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
                );
            }
        }

        updateTitle(count, location) {
            if (this.counter) {
                this.counter.textContent = count;
            }

            if (this.title) {
                // Mobile: Kompaktere Darstellung
                if (this.isMobile()) {
                    this.title.innerHTML = `
                    <span class="agtech-org-counter">${count}</span>
                    <div style="text-align: center;">
                        <div style="font-size: 0.9rem;">Akteure in</div>
                        <div style="font-size: 1rem; font-weight: 600;">${location}</div>
                    </div>
                `;
                } else {
                    // Desktop: Original Layout
                    const locationText = document.createElement('span');
                    locationText.className = 'location-text';
                    locationText.textContent = `Akteure in ${location}`;

                    this.title.innerHTML = '';
                    this.title.appendChild(this.counter);
                    this.title.appendChild(locationText);
                }
            }
        }

        renderOrganizations(organizations) {
            if (!this.content) return;

            const cardsHTML = organizations.map(org => this.createOrganizationCard(org)).join('');
            this.content.innerHTML = cardsHTML;
        }

        createOrganizationCard(org) {
            const typeColor = this.app.getTypeColor(org.OrganizationType);
            const categoryColor = this.app.getCategoryColor(org.FinalCategories);

            return `
            <div class="agtech-org-card">
                <div class="agtech-org-badges">
                    <span class="agtech-org-badge" style="background-color: ${typeColor}">
                        ${org.OrganizationType || 'Startup'}
                    </span>
                    ${org.FinalCategories ? `
                        <span class="agtech-org-badge" style="background-color: ${categoryColor}">
                            ${org.FinalCategories}
                        </span>
                    ` : ''}
                </div>
                <h3 class="agtech-org-name">${this.escapeHtml(org.OrganizationName)}</h3>
                ${org.AiSummary ? `
                    <p class="agtech-org-description">${this.escapeHtml(org.AiSummary)}</p>
                ` : ''}
                ${org.WebsiteUrl ? `
                    <a href="${this.escapeHtml(org.WebsiteUrl)}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       class="agtech-org-link"
                       onclick="event.stopPropagation();">
                        Website besuchen
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11M15 3H21V9M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </a>
                ` : ''}
            </div>
        `;
        }

        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text.toString();
            return div.innerHTML;
        }
    }

    /**
     * Filter component handling filter UI and logic
     */
    class FilterComponent {
        /**
         * @param {AgTechMapApp} app - Reference to main app
         */
        constructor(app) {
            this.app = app;
            this.typeFilters = document.getElementById('agtech-type-filters');
            this.categoryFilters = document.getElementById('agtech-category-filters');
            this.categoryGroup = document.getElementById('agtech-category-filter-group');
            this.filterContent = document.getElementById('agtech-filter-content');
            this.filterToggle = document.getElementById('agtech-filter-toggle');

            this.activeFilters = {
                type: null,
                categories: new Set()
            };
        }

        /**
         * Initialize filters with data
         * @param {Array} data - Organization data
         */
        initialize(data) {
            this.createTypeFilters();
            this.createCategoryFilters(data);
        }

        /**
         * Create type filter buttons
         */
        createTypeFilters() {
            if (!this.typeFilters) return;

            const typeButtons = [
                { key: 'startup', label: 'Startups', color: COLOR_SCHEMES.types['Startup'] },
                { key: 'other', label: 'Andere', color: '#4e5559' }
            ];

            typeButtons.forEach(({ key, label, color }) => {
                const button = document.createElement('button');
                button.className = 'agtech-filter-btn';
                button.textContent = label;
                button.style.backgroundColor = color;
                button.setAttribute('data-type', key);
                button.setAttribute('aria-pressed', 'false');

                button.addEventListener('click', () => this.handleTypeFilter(key, button));
                this.typeFilters.appendChild(button);
            });
        }

        /**
         * Create category filter buttons
         * @param {Array} data - Organization data
         */
        createCategoryFilters(data) {
            if (!this.categoryFilters) return;

            const categories = [...new Set(data.map(org => org.FinalCategories))]
                .filter(Boolean)
                .sort();

            categories.forEach(category => {
                const button = document.createElement('button');
                button.className = 'agtech-filter-btn';
                button.textContent = category;
                button.style.backgroundColor = this.app.getCategoryColor(category);
                button.setAttribute('data-category', category);
                button.setAttribute('aria-pressed', 'false');

                button.addEventListener('click', () => this.handleCategoryFilter(category, button));
                this.categoryFilters.appendChild(button);
            });
        }

        /**
         * Handle type filter selection
         * @param {string} type - Filter type (startup/other)
         * @param {HTMLElement} button - Button element
         */
        handleTypeFilter(type, button) {
            const isActive = this.activeFilters.type === type;

            // Reset all type buttons
            this.typeFilters.querySelectorAll('.agtech-filter-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            });

            if (isActive) {
                // Deactivate current filter
                this.activeFilters.type = null;
                this.toggleCategoryFilters(true);
            } else {
                // Activate new filter
                this.activeFilters.type = type;
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');

                // Show/hide category filters based on type
                this.toggleCategoryFilters(type === 'startup');

                if (type === 'other') {
                    // Clear category filters when showing 'other'
                    this.clearCategoryFilters();
                }
            }

            this.updateFilters();
        }

        /**
         * Handle category filter selection
         * @param {string} category - Category name
         * @param {HTMLElement} button - Button element
         */
        handleCategoryFilter(category, button) {
            const isActive = button.classList.contains('active');

            if (isActive) {
                button.classList.remove('active');
                button.setAttribute('aria-pressed', 'false');
                this.activeFilters.categories.delete(category);
            } else {
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');
                this.activeFilters.categories.add(category);
            }

            this.updateFilters();
        }

        /**
         * Toggle category filter visibility
         * @param {boolean} show - Whether to show category filters
         */
        toggleCategoryFilters(show) {
            if (this.categoryGroup) {
                if (show) {
                    this.categoryGroup.classList.remove('hidden');
                } else {
                    this.categoryGroup.classList.add('hidden');
                }
            }
        }

        /**
         * Clear all category filters
         */
        clearCategoryFilters() {
            this.activeFilters.categories.clear();
            this.categoryFilters.querySelectorAll('.agtech-filter-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            });
        }

        /**
         * Update filters in the main app
         */
        updateFilters() {
            this.app.updateFilters({ ...this.activeFilters });
        }

        /**
         * Toggle mobile filter visibility
         */
        toggleMobileFilters() {
            if (this.filterContent && this.filterToggle) {
                const isCollapsed = this.filterContent.classList.contains('collapsed');

                if (isCollapsed) {
                    this.filterContent.classList.remove('collapsed');
                    this.filterToggle.textContent = 'Filter ausblenden';
                } else {
                    this.filterContent.classList.add('collapsed');
                    this.filterToggle.textContent = 'Filter anzeigen';
                }
            }
        }
    }

    /**
     * Table component handling data table functionality
     */
    class TableComponent {
        /**
         * @param {AgTechMapApp} app - Reference to main app
         */
        constructor(app) {
            this.app = app;
            this.tableBody = document.getElementById('agtech-table-body');
            this.currentData = [];
            this.filteredData = [];

            // Performance optimization
            this.renderTimeout = null;
        }

        /**
         * Initialize table with data
         * @param {Array} data - Organization data
         */
        initialize(data) {
            this.currentData = data;
            this.filteredData = [...data];
            this.renderTable();
        }

        /**
         * Apply filters to table data
         * @param {Object} filters - Active filter state
         */
        applyFilters(filters) {
            // Clear existing timeout
            if (this.renderTimeout) {
                clearTimeout(this.renderTimeout);
            }

            // Debounce rendering for better performance
            this.renderTimeout = setTimeout(() => {
                this.filteredData = this.currentData.filter(org => {
                    return this.matchesFilters(org, filters);
                });

                this.renderTable();
            }, CONFIG.performance.debounceDelay);
        }

        /**
         * Check if organization matches active filters
         * @param {Object} org - Organization data
         * @param {Object} filters - Filter criteria
         * @returns {boolean} Whether organization matches filters
         */
        matchesFilters(org, filters) {
            // Type filter logic
            const typeMatch = filters.type === null ||
                (filters.type === 'startup' &&
                    (org.OrganizationType === 'Startup' || !org.OrganizationType)) ||
                (filters.type === 'other' &&
                    org.OrganizationType && org.OrganizationType !== 'Startup');

            // Category filter logic (only apply if not showing 'other' type)
            const categoryMatch = filters.type === 'other' ||
                filters.categories.size === 0 ||
                filters.categories.has(org.FinalCategories);

            return typeMatch && categoryMatch;
        }

        /**
         * Render table with current filtered data
         */
        renderTable() {
            if (!this.tableBody) return;

            // Performance optimization for large datasets
            if (this.filteredData.length > CONFIG.performance.maxTableRows) {
                this.renderVirtualizedTable();
            } else {
                this.renderStandardTable();
            }
        }

        /**
         * Render standard table (for smaller datasets)
         */
        renderStandardTable() {
            const rowsHTML = this.filteredData
                .map(org => this.createTableRow(org))
                .join('');

            this.tableBody.innerHTML = rowsHTML;
        }

        /**
         * Render virtualized table (for large datasets)
         * Note: Simplified virtualization - in production, consider using a library
         */
        renderVirtualizedTable() {
            const visibleRows = CONFIG.performance.virtualScrollThreshold;
            const visibleData = this.filteredData.slice(0, visibleRows);

            const rowsHTML = visibleData
                .map(org => this.createTableRow(org))
                .join('');

            // Add indicator for remaining rows
            const remainingCount = this.filteredData.length - visibleRows;
            const remainingHTML = remainingCount > 0 ? `
                <tr class="agtech-table-remaining">
                    <td colspan="5" style="text-align: center; padding: 2rem; color: #666;">
                        ... und ${remainingCount} weitere Einträge
                        <br>
                        <small>Nutzen Sie Filter um die Anzahl zu reduzieren</small>
                    </td>
                </tr>
            ` : '';

            this.tableBody.innerHTML = rowsHTML + remainingHTML;
        }

        /**
         * Create HTML for table row
         * @param {Object} org - Organization data
         * @returns {string} HTML string
         */
        createTableRow(org) {
            const typeColor = this.app.getTypeColor(org.OrganizationType);
            const categoryColor = this.app.getCategoryColor(org.FinalCategories);

            return `
                <tr>
                    <td>
                        <strong>${this.escapeHtml(org.OrganizationName)}</strong>
                    </td>
                    <td>
                        <span class="agtech-table-badge" style="background-color: ${typeColor}">
                            ${this.escapeHtml(org.OrganizationType || 'Startup')}
                        </span>
                    </td>
                    <td>
                        ${org.FinalCategories ? `
                            <span class="agtech-table-badge" style="background-color: ${categoryColor}">
                                ${this.escapeHtml(org.FinalCategories)}
                            </span>
                        ` : '<span style="color: #999;">N/A</span>'}
                    </td>
                    <td>
                        ${org.Headquarter ? this.escapeHtml(org.Headquarter) : '<span style="color: #999;">N/A</span>'}
                    </td>
                    <td>
                        ${org.WebsiteUrl ? `
                            <a href="${this.escapeHtml(org.WebsiteUrl)}" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                class="agtech-table-link">
                                Website besuchen
                            </a>
                        ` : '<span style="color: #999;">N/A</span>'}
                    </td>
                </tr>
            `;
        }

        /**
         * Escape HTML to prevent XSS
         * @param {string} text - Text to escape
         * @returns {string} Escaped text
         */
        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text.toString();
            return div.innerHTML;
        }

        /**
         * Get current filtered data count
         * @returns {number} Number of filtered items
         */
        getFilteredCount() {
            return this.filteredData.length;
        }

        /**
         * Export filtered data as CSV
         * @returns {string} CSV string
         */
        exportAsCSV() {
            const headers = ['Name', 'Typ', 'Kategorie', 'Hauptsitz', 'Website'];
            const rows = this.filteredData.map(org => [
                org.OrganizationName,
                org.OrganizationType || 'Startup',
                org.FinalCategories || '',
                org.Headquarter || '',
                org.WebsiteUrl || ''
            ]);

            const csvContent = [headers, ...rows]
                .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
                .join('\n');

            return csvContent;
        }
    }

    /**
     * Utility functions
     */
    const Utils = {
        /**
         * Debounce function execution
         * @param {Function} func - Function to debounce
         * @param {number} wait - Wait time in milliseconds
         * @returns {Function} Debounced function
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Throttle function execution
         * @param {Function} func - Function to throttle
         * @param {number} limit - Time limit in milliseconds
         * @returns {Function} Throttled function
         */
        throttle(func, limit) {
            let inThrottle;
            return function (...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Format number with thousand separators
         * @param {number} num - Number to format
         * @returns {string} Formatted number
         */
        formatNumber(num) {
            return new Intl.NumberFormat('de-DE').format(num);
        },

        /**
         * Validate URL
         * @param {string} url - URL to validate
         * @returns {boolean} Whether URL is valid
         */
        isValidUrl(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        },

        /**
         * Get responsive breakpoint
         * @returns {string} Current breakpoint
         */
        getBreakpoint() {
            const width = window.innerWidth;
            if (width < 768) return 'mobile';
            if (width < 1024) return 'tablet';
            return 'desktop';
        }
    };

    // Utility-Funktion für Mobile-Detection
    window.AgTechUtils = {
        ...window.AgTechUtils,
        
        isMobile() {
            return window.innerWidth <= 768;
        },
        
        isTouch() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        },
        
        getOrientation() {
            return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
        }
    };
    /**
     * Initialize application when DOM is ready
     */
    function initializeApp() {
        // Check for required dependencies
        if (typeof L === 'undefined') {
            console.error('Leaflet library not found. Please ensure it is loaded before initializing the app.');
            return;
        }

        if (typeof Papa === 'undefined') {
            console.error('PapaParse library not found. Please ensure it is loaded before initializing the app.');
            return;
        }

        // Initialize the application
        try {
            window.agTechApp = new AgTechMapApp();
            console.log('AgTech Map Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AgTech Map Application:', error);
        }
    }

    /**
     * Auto-collapse filters on mobile when page loads
     */
    function handleInitialMobileState() {
        if (Utils.getBreakpoint() === 'mobile') {
            const filterContent = document.getElementById('agtech-filter-content');
            const filterToggle = document.getElementById('agtech-filter-toggle');

            if (filterContent && filterToggle) {
                filterContent.classList.add('collapsed');
                filterToggle.textContent = 'Filter anzeigen';
            }
        }
    }

    /**
     * Setup performance monitoring (optional)
     */
    function setupPerformanceMonitoring() {
        if ('performance' in window && 'mark' in performance) {
            performance.mark('agtech-app-start');

            window.addEventListener('load', () => {
                performance.mark('agtech-app-loaded');
                performance.measure('agtech-app-load-time', 'agtech-app-start', 'agtech-app-loaded');

                const measure = performance.getEntriesByName('agtech-app-load-time')[0];
                console.log(`AgTech App loaded in ${Math.round(measure.duration)}ms`);
            });
        }
    }

    /**
     * Entry point - Initialize when DOM is ready
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            handleInitialMobileState();
            setupPerformanceMonitoring();
            initializeApp();
        });
    } else {
        // DOM already loaded
        handleInitialMobileState();
        setupPerformanceMonitoring();
        initializeApp();
    }

    // Export utilities for external use if needed
    window.AgTechUtils = Utils;

})(); // End of IIFE

/**
 * Global error handler for unhandled errors
 */
window.addEventListener('error', (event) => {
    console.error('AgTech App Error:', event.error);

    // Optional: Send error to monitoring service
    // ErrorReporting.send(event.error);
});

/**
 * Global handler for unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('AgTech App Promise Rejection:', event.reason);

    // Optional: Send error to monitoring service
    // ErrorReporting.send(event.reason);
});
