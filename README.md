# AgTech Ökosystem Deutschland 🌱

Eine interaktive Webkarte zur Visualisierung des deutschen Agritech-Ökosystems mit Startups, Investoren, Forschungsinstituten und weiteren Akteuren.

![AgTech Ökosystem Karte](https://i.ibb.co/ZzcVwwLc/grafik.png)

## 🚀 Features

- **📍 Interaktive Karte** mit intelligenter Marker-Gruppierung
- **🔍 Erweiterte Filteroptionen** nach Typ und Kategorie
- **📱 Responsive Design** für alle Geräte
- **📊 Datentabelle** mit Export-Funktionen
- **🎯 Detailansichten** für einzelne Organisationen
- **⚡ Performance-optimiert** für große Datensätze

## 🛠️ Technologie-Stack

- **Frontend**: Vanilla JavaScript (ES6+), CSS3, HTML5
- **Kartenbibliothek**: Leaflet.js mit Marker-Clustering
- **Datenverarbeitung**: PapaParse für CSV-Import
- **Styling**: Modern CSS mit Flexbox/Grid
- **Accessibility**: WCAG 2.1 konform

## 🏃‍♂️ Quick Start

### 1. Repository klonen
```bash
git clone https://git.informatik.uni-leipzig.de/ps83huvo/agtech-ecosystem-map.git
cd agtech-ecosystem-map
```

### 2. Lokaler Webserver starten
```bash
# Python 3
python -m http.server 8000

# Node.js (wenn installiert)
npx serve .

# PHP
php -S localhost:8000
```

### 3. Im Browser öffnen
```
http://localhost:8000
```

## 📁 Projektstruktur

```
agtech-ecosystem-map/
├── index.html                 # Hauptdatei (refaktorierte Version)
├── agtech-ecosystem-data.csv  # Organisationsdaten
├── script.js                  # JavaScript-Logik
├── style.css                  # Styling
└── README.md                  # Diese Datei
```

## 🔧 Konfiguration

### CSV-Datenformat
Die Anwendung erwartet eine CSV-Datei mit folgender Struktur:

```csv
OrganizationName;OrganizationType;FinalCategories;Headquarter;WebsiteUrl;AiSummary;Latitude;Longitude
Example Startup;Startup;Farm Management;Berlin;https://example.com;Kurzbeschreibung;52.5200;13.4050
```

### Anpassbare Einstellungen
```javascript
// In script.js - CONFIG-Objekt
const CONFIG = {
    data: {
        csvUrl: 'agtech-ecosystem-data.csv',  // Pfad zu CSV-Datei
        delimiter: ';'                        // CSV-Trennzeichen
    },
    map: {
        center: [51.1657, 10.4515],          // Karten-Zentrum (Deutschland)
        zoom: { default: 6, mobile: 5 }      // Zoom-Level
    }
};
```

## 🎨 Farben anpassen

Die Farbschemas für Organisationstypen und Kategorien können im `COLOR_SCHEMES`-Objekt angepasst werden:

```javascript
const COLOR_SCHEMES = {
    types: {
        'Startup': '#00CD6C',
        'Accelerator': '#F28522',
        // ... weitere Typen
    },
    categories: {
        'Farm Management, Sensorik und IoT': '#1a936f',
        // ... weitere Kategorien
    }
};
```

## 📱 Mobile Optimierung

- ✅ Touch-freundliche Bedienung
- ✅ Optimierte Performance auf mobilen Geräten
- ✅ Kollabierbare Filter-Panels
- ✅ Angepasste Marker-Größen

## 🔗 Integration in bestehende Websites

### Option 1: Iframe
```html
<iframe 
    src="pfad/zur/agtech-karte.html" 
    width="100%" 
    height="800px"
    style="border: none;">
</iframe>
```

### Option 2: JavaScript-Integration
```html
<div id="agtech-map-container"></div>
<script src="pfad/zu/agtech-app.js"></script>
<script>
    const app = new AgTechMapApp({
        container: '#agtech-map-container',
        csvUrl: 'pfad/zu/daten.csv'
    });
</script>
```

## 🚀 Deployment

### Webserver-Anforderungen
- **CORS-Header** für CSV-Dateien aktivieren
- **HTTPS** empfohlen (für Geolocation-Features)
- **Gzip-Kompression** für bessere Performance

### Apache (.htaccess)
```apache
<Files "*.csv">
    Header set Access-Control-Allow-Origin "*"
</Files>
```

### Nginx
```nginx
location ~ \.csv$ {
    add_header Access-Control-Allow-Origin *;
}
```

## 🎯 Browser-Unterstützung

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 90+     | ✅ Vollständig |
| Firefox | 88+     | ✅ Vollständig |
| Safari  | 14+     | ✅ Vollständig |
| Edge    | 90+     | ✅ Vollständig |

## 📊 Performance

- **First Load**: < 3s
- **Filter-Updates**: < 300ms
- **Memory Usage**: < 100MB
- **Mobile Performance**: Optimiert für 3G-Verbindungen

## 🐛 Bekannte Probleme & Lösungen

### CSV-Datei wird nicht geladen
```javascript
// Debug-Modus aktivieren
const CONFIG = {
    debug: true,
    data: { csvUrl: './agtech-ecosystem-data.csv' }
};
```

### Performance auf mobilen Geräten
- Marker-Clustering ist standardmäßig aktiviert
- Virtual Scrolling ab 500+ Tabelleneinträgen
- Debounced Filter-Updates (300ms)

## 🤝 Beitragen

1. **Fork** des Repositories
2. **Feature Branch** erstellen (`git checkout -b feature/amazing-feature`)
3. **Commits** mit aussagekräftigen Nachrichten
4. **Push** zum Branch (`git push origin feature/amazing-feature`)
5. **Pull Request** erstellen

### Code-Standards
- ES6+ JavaScript
- Semantic HTML
- CSS mit BEM-Methodologie
- JSDoc für Funktions-Dokumentation

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details.


## 🏆 Credits

- **Karten-Daten**: OpenStreetMap Contributors
- **Icons**: Leaflet.js
- **CSV-Parser**: PapaParse
- **Entwicklung**: ricardofauch
