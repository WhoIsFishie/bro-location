# bro-location

A modern SMS location tracking and visualization application. Built with React, TypeScript, and Leaflet to display SMS messages with GPS coordinates on an interactive map.

## Features

- **Interactive Map Visualization** - View SMS messages plotted on OpenStreetMap using Leaflet
- **Progressive Loading** - Efficiently loads large datasets with batched rendering
- **Viewport Optimization** - Only renders markers visible in current map view for performance
- **Message Details** - Click markers to view SMS content, sender info, and timestamps
- **Mobile Responsive** - Dual-pane interface with mobile-friendly tab navigation
- **URL-based Data Loading** - Load JSON data from remote URLs via query parameters
- **Worker-based Processing** - Background data normalization for smooth UI performance

## Data Format

The application expects SMS records in JSON format with location data:

```json
[
  {
    "id": 1,
    "type": "sms",
    "timestamp": {
      "date": "05/06/2014",
      "time": "15:12:53(UTC+0)"
    },
    "party": {
      "direction": "from",
      "phone": "+1234567890", 
      "name": "Contact Name"
    },
    "message": "Message content here",
    "location_data": {
      "latitude": 4.1755,
      "longitude": 73.5093
    }
  }
]
```

## Usage

### Loading Data via URL
Visit the application with a `json` or `url` query parameter:
```
https://yoursite.com/bro-location/?json=https://example.com/data.json
```

### File Upload
Use the built-in data loader component to upload JSON files directly through the interface.

## Development

### Prerequisites
- Node.js 18+
- npm or pnpm

### Setup
```bash
# Clone repository
git clone <repository-url>
cd bro-location

# Install dependencies  
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Project Structure
```
src/
├── components/
│   ├── MapView.tsx          # Leaflet map component
│   ├── RecordList.tsx       # SMS message list
│   └── DataLoader.tsx       # File upload interface
├── types/
│   └── types.ts             # TypeScript definitions
├── utils/
│   └── normalize.ts         # Data processing utilities
├── workers/
│   └── normalizeWorker.ts   # Background data processing
└── App.tsx                  # Main application component
```

## Technologies

- **React 18** with TypeScript
- **Leaflet** for interactive maps
- **Vite** for build tooling and development server
- **Web Workers** for background data processing
- **OpenStreetMap** tiles for map display

## Deployment

Configured for GitHub Pages deployment:
- Base path: `/bro-location/`
- Automatic builds on push to main branch
- SPA routing support for GitHub Pages

## Performance Optimizations

- **Viewport Culling** - Only renders markers in visible map area
- **Progressive Loading** - Loads markers in batches to prevent UI blocking
- **Spatial Sampling** - Reduces marker density at high zoom levels
- **Worker Processing** - Data normalization runs in background thread
- **Memory Management** - Efficient marker lifecycle and cleanup

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+
- Mobile browsers with modern JavaScript support

## License

MIT License
