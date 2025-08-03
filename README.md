# 🗺️ Place & Trade Area Data Visualization

A React-based interactive map application for visualizing business locations and customer analysis data. Built with Next.js 15, TypeScript, Material-UI, and Deck.gl for high-performance mapping.

## 🎯 What We Built

### Core Functionality

- **Interactive Map**: Visualize business locations with clustering for 28K+ places
- **Customer Analysis**: Two data types - Trade Areas (percentage-based catchment) and Home Zipcodes (customer origin)
- **Smart Filtering**: Radius and industry-based filtering with real-time updates
- **Individual Data Control**: Tooltip-based data display for specific places only
- **Dynamic Legends**: Context-sensitive legends matching selected data types

### Key Features

- ✅ **Performance Optimized**: Smart clustering algorithm handles large datasets efficiently
- ✅ **Real Data Integration**: Works with actual business data from Google Drive
- ✅ **User-Friendly UI**: Material-UI components with responsive design
- ✅ **Error Handling**: Robust error handling with user-friendly notifications
- ✅ **Data Validation**: Automatic detection of data availability mismatches

## 🏗️ Technical Stack

- **Frontend**: React 18 + Next.js 15 (App Router)
- **Language**: TypeScript (strict typing)
- **UI Library**: Material-UI v5 with SSR-compatible ThemeRegistry
- **Mapping**: Deck.gl + Mapbox GL JS (react-map-gl v8.0)
- **State Management**: React Hooks (useState, useMemo, useCallback)
- **Performance**: Custom clustering algorithm, lazy loading, caching

## 🚀 Key Technical Achievements

### Performance Engineering

- **Smart Clustering**: Grid-based O(n) algorithm for 28K+ places
- **Distance-Based Limiting**: Haversine formula for accurate geo-distance
- **Lazy Loading**: HTTP-based loading for 347MB+ datasets
- **Memory Optimization**: Caching strategies for large JSON files

### Data Management

- **Dual Data Sources**: Mock NYC data + Real Colorado Springs data
- **Type Safety**: Complete TypeScript interfaces for all data structures
- **Error Handling**: Graceful degradation for missing/malformed data
- **Data Quality Validation**: Automatic detection of availability mismatches

### User Experience

- **Individual Data Control**: Tooltip buttons show only specific place data
- **Business Rules**: Multiple trade areas, single home zipcodes
- **Notification System**: Global notification system for errors and warnings
- **Responsive Design**: Works across different screen sizes

## 📊 Data Structure

```typescript
type Place = {
  id: string;
  name: string;
  street_address: string;
  city: string;
  state: string;
  logo: string | null;
  longitude: number;
  latitude: number;
  industry: string;
  isTradeAreaAvailable: boolean;
  isHomeZipcodesAvailable: boolean;
};

type TradeArea = {
  pid: string;
  polygon: Polygon;
  trade_area: number; // 30, 50, or 70
};

type HomeZipcodes = {
  pid: string;
  locations: Location[]; // zipcode percentile data
};
```

## 🎨 UI Layout

### Three-Panel Design

1. **Left Sidebar**: Filters & Controls
   - Place Analysis (radius, industry filters)
   - Customer Analysis (data type, trade area selection)
2. **Center Map**: Interactive visualization
   - Place markers with clustering
   - Trade area polygons
   - Home zipcode polygons
3. **Right Sidebar**: Dynamic Legend
   - Context-sensitive legends
   - Performance information

## 🔧 Business Logic Implemented

### Data Display Rules

- **Trade Areas**: Multiple places can have trade areas visible simultaneously
- **Home Zipcodes**: Only one place's data visible at a time (replaces previous)
- **Data Type Switching**: When switching to Home Zipcodes, only "My Place" remains visible
- **Individual Control**: Customer Data toggle enables tooltip buttons, doesn't auto-show data

### Validation & Error Handling

- **Data Availability**: Check actual data vs place flags for accurate button states
- **User Feedback**: Clear notifications for errors and warnings
- **Graceful Degradation**: Handle missing or malformed data gracefully

## 🎯 Project Status: **100% COMPLETE**

All core business requirements are implemented and working perfectly!

### Recent Enhancements (January 2025)

- ✅ **Notification System**: Replaced console logs with user-friendly notifications
- ✅ **Duplicate Prevention**: Robust system to prevent duplicate notifications
- ✅ **Streamlined UX**: Only important notifications shown (errors, warnings)
- ✅ **Data Quality**: Enhanced validation and error handling

## 🚀 Getting Started

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Add Mapbox token**: Create `.env.local` with `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token`
4. **Run development server**: `npm run dev`
5. **Open browser**: Navigate to `http://localhost:3000`

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router
├── components/          # React components
│   ├── Map.tsx         # Main map component
│   ├── LeftSidebar.tsx # Filter controls
│   ├── Legend.tsx      # Dynamic legend
│   └── NotificationSystem.tsx # Global notifications
├── data/               # Data loading utilities
├── hooks/              # Custom React hooks
├── types/              # TypeScript interfaces
└── utils/              # Utility functions
```

## 🏆 Technical Highlights

- **Enterprise-level performance** with smart clustering for large datasets
- **Production-ready architecture** with proper error boundaries
- **Scalable data management** with async loading and caching
- **User-centric design** with individual data control
- **Robust error handling** with comprehensive validation

This represents a **production-ready foundation** with enterprise-level performance optimizations and scalable architecture!
