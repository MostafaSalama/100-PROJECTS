# 🗂️ FlashTodo - Flash Card Todo PWA

A beautiful, color-coded flash card todo application built as a Progressive Web App (PWA) with offline support, folder organization, and advanced filtering capabilities.

![FlashTodo Preview](./preview-screenshot.png)

## ✨ Features

### 📋 Core Todo Management
- **Flash Card Design**: Visually appealing todo items displayed as interactive cards
- **Color-Coded Statuses**: Each status has a unique color theme and gradient
- **Status Management**: Todo, In Progress, Completed, On Hold
- **Priority Levels**: High (🔴), Medium (🟡), Low (🟢) with visual indicators
- **Rich Content**: Title, description, tags, due dates, and notes

### 📁 Organization & Structure
- **Folder System**: Organize todos into custom folders with icons
- **Tag Support**: Add multiple tags to todos for better categorization
- **Smart Filtering**: Filter by status, priority, folder, tags, and search
- **Folder Counts**: Real-time counts of todos in each folder

### 🎨 Visual Design
- **Modern UI**: Glassmorphism design with beautiful gradients
- **Status Colors**: 
  - 📋 **Todo**: Blue/Purple gradient (`#667eea` → `#764ba2`)
  - 🔄 **In Progress**: Pink/Orange gradient (`#f093fb` → `#f5576c`) 
  - ✅ **Completed**: Blue/Cyan gradient (`#4facfe` → `#00f2fe`)
  - ⏸️ **On Hold**: Purple/Teal gradient (`#8360c3` → `#2ebf91`)
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Dark Theme**: Modern dark interface with beautiful accent colors
- **Smooth Animations**: Card entrance animations and hover effects

### 🔍 Advanced Filtering & Search
- **Real-time Search**: Search across titles, descriptions, and tags
- **Multiple Filters**: Combine status, priority, folder, and tag filters
- **Quick Filters**: One-click status and priority filtering
- **Tag Filtering**: Click any tag to filter todos instantly
- **Filter Memory**: Remembers your filter preferences

### 📱 Progressive Web App Features
- **Offline Support**: Works completely offline with local storage
- **Installable**: Install as a native app on any device
- **Background Sync**: Syncs changes when back online
- **Service Worker**: Intelligent caching for fast loading
- **App Shortcuts**: Quick actions from home screen
- **Network Awareness**: Shows online/offline status

### 🎯 User Experience
- **Keyboard Shortcuts**: Power user shortcuts for quick actions
- **Drag & Drop**: Intuitive interactions (future feature)
- **Context Menus**: Right-click options for advanced actions
- **Quick Actions**: Edit, delete, duplicate, and share todos
- **Auto-save**: Automatic saving of changes
- **Import/Export**: Backup and restore your data

## 🚀 Installation

### Method 1: Install as PWA (Recommended)
1. Open [FlashTodo](https://your-domain.com) in your browser
2. Look for the install prompt or click the install button
3. Follow your browser's installation instructions
4. Launch FlashTodo from your home screen or app drawer

### Method 2: Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/flashtodo-pwa.git
cd flashtodo-pwa

# Serve the files using a local server
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx serve .

# Option 3: PHP
php -S localhost:8000

# Open http://localhost:8000 in your browser
```

## 🎮 Usage

### Creating Your First Todo
1. Click the **"+ Add Todo"** button
2. Fill in the todo details:
   - **Title** (required): What needs to be done
   - **Description**: Additional details
   - **Status**: Todo, In Progress, Completed, or On Hold
   - **Priority**: High, Medium, or Low
   - **Folder**: Organize into a specific folder
   - **Tags**: Add comma-separated tags
   - **Due Date**: Set a deadline

### Managing Folders
1. Click **"+ Add Folder"** in the sidebar
2. Choose a name and emoji icon
3. Assign todos to folders when creating or editing
4. Click any folder to filter todos

### Using Filters
- **Search**: Type in the search bar to find specific todos
- **Status Filter**: Click status buttons to filter by completion state  
- **Priority Filter**: Filter by priority level
- **Tag Filter**: Click any tag on a todo to filter by that tag
- **Combined Filters**: Use multiple filters together

### Keyboard Shortcuts
- `Ctrl/Cmd + N` - Create new todo
- `/` - Focus search bar
- `V` - Toggle between card and list view
- `Ctrl/Cmd + 1-4` - Quick status filters
- `Escape` - Clear filters or close modals

### Flash Card Interactions
- **Click**: Open todo for editing
- **Double-click**: Quick edit mode
- **Status Dropdown**: Change status directly on the card
- **Action Buttons**: Edit, delete, or more options
- **Tag Clicks**: Filter by that tag instantly

## 🔧 Technical Stack

### Frontend Technologies
- **HTML5**: Modern semantic markup
- **CSS3**: Advanced styling with CSS variables, gradients, and animations
- **Vanilla JavaScript (ES6+)**: Modern JavaScript without frameworks
- **CSS Grid & Flexbox**: Responsive layout system

### PWA Technologies
- **Service Worker**: Offline support and caching
- **Web App Manifest**: Installation and app metadata
- **Local Storage**: Data persistence
- **IndexedDB**: Advanced offline storage
- **Background Sync**: Sync when online

### Architecture
- **Component-Based**: Modular JavaScript components
- **Service Layer**: Separation of concerns with services
- **Event-Driven**: Custom event system for component communication
- **Progressive Enhancement**: Works even without JavaScript

## 📁 Project Structure

```
Project-04-FlashTodo-PWA/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── service-worker.js       # Service worker for offline support
├── README.md               # This file
├── 
├── css/                    # Stylesheets
│   ├── main.css           # Main application styles
│   ├── flash-cards.css    # Flash card specific styles
│   └── folders.css        # Folder and modal styles
├── 
├── js/                    # JavaScript modules
│   ├── app.js            # Main application controller
│   ├── utils/
│   │   └── constants.js  # App constants and utilities
│   ├── services/
│   │   ├── StorageService.js  # Data storage management
│   │   └── PWAService.js      # PWA functionality
│   └── components/
│       ├── FlashCard.js       # Individual todo card component
│       ├── FolderManager.js   # Folder management
│       └── FilterManager.js   # Search and filtering
├── 
├── icons/                 # PWA icons
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-384.png
│   └── icon-512.png
└── 
└── assets/               # Additional assets
    ├── screenshot-desktop.png
    └── screenshot-mobile.png
```

## 🎨 Color Scheme & Design

### Status Color Palette
```css
/* Todo - Blue/Purple */
--status-todo: #667eea → #764ba2

/* In Progress - Pink/Orange */ 
--status-progress: #f093fb → #f5576c

/* Completed - Blue/Cyan */
--status-completed: #4facfe → #00f2fe

/* On Hold - Purple/Teal */
--status-hold: #8360c3 → #2ebf91
```

### Design Principles
- **Glassmorphism**: Semi-transparent elements with backdrop blur
- **Modern Gradients**: Beautiful color transitions
- **Micro-interactions**: Subtle animations and hover effects
- **Accessibility**: High contrast and keyboard navigation
- **Mobile-first**: Responsive design that works everywhere

## 🔌 API Reference

### FlashTodoApp Class
The main application controller that orchestrates all functionality.

```javascript
// Initialize the app
const app = new FlashTodoApp();

// Create a new todo
await app.createTodo({
    title: "Learn PWA development",
    description: "Build a todo app with offline support",
    status: "todo",
    priority: "high",
    tags: ["learning", "pwa"]
});

// Export all data
const data = await app.exportData();

// Import data
await app.importData(data);

// Get app statistics  
const stats = app.getStatistics();
```

### StorageService Class
Handles all data persistence with offline support.

```javascript
// Get all todos
const todos = await storageService.getAllTodos();

// Save a todo
await storageService.saveTodo(todo);

// Delete a todo
await storageService.deleteTodo(todoId);
```

### Events System
The app uses custom events for component communication.

```javascript
// Listen for todo creation
window.addEventListener('storage:todoSaved', (event) => {
    console.log('Todo saved:', event.detail);
});

// Listen for filter changes
window.addEventListener('filters:changed', (event) => {
    console.log('Filters changed:', event.detail);
});
```

## 🌟 Advanced Features

### Offline Support
- **Complete Offline Functionality**: Create, edit, and delete todos without internet
- **Background Sync**: Changes sync automatically when reconnected
- **Offline Indicator**: Visual feedback when offline
- **Smart Caching**: Intelligent resource caching for fast loading

### Data Management
- **Auto-save**: Changes are saved automatically
- **Backup System**: Automatic periodic backups
- **Import/Export**: JSON-based data portability
- **Data Validation**: Comprehensive input validation

### Performance Optimizations
- **Lazy Loading**: Components load as needed
- **Debounced Search**: Efficient search with input debouncing
- **Memory Management**: Proper cleanup of components and events
- **Minimal Bundle**: No external dependencies

## 📱 Browser Support

### Supported Browsers
- ✅ **Chrome 67+** (Full PWA support)
- ✅ **Firefox 62+** (Full PWA support) 
- ✅ **Safari 11.1+** (Limited PWA support)
- ✅ **Edge 79+** (Full PWA support)
- ✅ **Samsung Internet 8.2+** (Full PWA support)

### PWA Features by Browser
| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|---------|------|
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| App Install | ✅ | ✅ | ⚠️ | ✅ |
| Background Sync | ✅ | ✅ | ❌ | ✅ |
| Push Notifications | ✅ | ✅ | ❌ | ✅ |
| App Shortcuts | ✅ | ❌ | ❌ | ✅ |

## 🚀 Deployment

### GitHub Pages
```bash
# Build and deploy to GitHub Pages
git add .
git commit -m "Deploy FlashTodo PWA"
git push origin main

# Enable GitHub Pages in repository settings
# Set source to main branch
```

### Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy to Netlify
netlify deploy --prod --dir=.
```

### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel --prod
```

## 🎯 Future Enhancements

### Planned Features
- [ ] **Collaboration**: Share folders with other users
- [ ] **Themes**: Light/dark theme toggle and custom themes
- [ ] **Calendar Integration**: Sync with Google Calendar
- [ ] **Notifications**: Push notifications for due dates
- [ ] **Voice Input**: Add todos using speech recognition
- [ ] **Drag & Drop**: Reorder todos and move between folders
- [ ] **Sub-todos**: Break large todos into smaller tasks
- [ ] **Time Tracking**: Track time spent on todos
- [ ] **Analytics**: Productivity insights and statistics
- [ ] **Sync Service**: Cloud synchronization across devices

### Technical Improvements
- [ ] **Unit Tests**: Comprehensive test coverage
- [ ] **E2E Tests**: End-to-end testing
- [ ] **Performance Monitoring**: Real user metrics
- [ ] **A11y Improvements**: Enhanced accessibility
- [ ] **Bundle Optimization**: Code splitting and tree shaking

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow the existing code style
4. **Add tests**: Ensure your changes are tested
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**: Describe your changes

### Development Guidelines
- Follow existing code style and patterns
- Add comments for complex logic
- Update README for new features
- Test on multiple browsers and devices
- Optimize for performance and accessibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Design Inspiration**: Modern todo applications and PWA examples
- **Color Palettes**: Beautiful gradient combinations from UI Gradients
- **Icons**: Emoji icons for universal compatibility
- **Fonts**: Inter and JetBrains Mono from Google Fonts

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/flashtodo-pwa/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/flashtodo-pwa/discussions)
- **Email**: your.email@example.com

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/yourusername">Your Name</a></p>
  <p>⭐ Star this project if you found it helpful!</p>
</div>
