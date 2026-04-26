📊 ClickCounter - Advanced Click Counter Application

A feature-rich, modern click counter web application built with vanilla JavaScript, CSS, and HTML. Includes themes, history tracking, undo support, export/import, and more!

**Live Link** https://sanzidahmed4.github.io/ClickCounter/
## 🎯 Features

### Core Functionality
- **Click Counter**: Interactive counter with smooth animations
- **Multiple Input Methods**: Click the big number, use buttons, or keyboard shortcuts
- **Keyboard Shortcuts**: Quick actions with keyboard commands
  - `+` or `Add` key: Increase by 1
  - `-` or `Subtract` key: Decrease by 1
  - `r`: Reset counter to 0
  - `z`: Undo last action
  - `s`: Show statistics
  - `e`: Export data
  - `i`: Import data

### Data Management
- **Auto-Save**: Automatically saves progress every 4 seconds and on visibility change
- **Session Persistence**: Remembers your count and history during the session
- **Export/Import**: 
  - 📥 Export data as JSON for backup
  - 📤 Import data from previously saved JSON files
  - Date-stamped backup files
  
### History Tracking
- **Click History**: Records all clicks with timestamps
- **Action Types**: Different action types (increment, decrement, add, subtract, set, reset, undo)
- **Last 50 Entries**: View the most recent click history entries in the modal
- **Lazy Loading**: Optimized rendering for performance
- **Clear History**: Delete all historical data with one click

### Undo
- **Undo Functionality**: Press `z` to undo the last action
- **Undo Stack**: Up to 50 previous states saved
- **Persistent Undo**: Undo history persists during your session

### Achievements & Milestones
- **Milestone Notifications**: Celebrate reaching major click counts
- **Tracked Milestones**: 10, 50, 100, 500, 1,000, 5,000, 10,000 clicks
- **Visual Celebrations**: Toast notifications when milestones are reached

### Advanced Controls
- **Manual Adjustment**: 
  - Add/Subtract specific amounts
  - Set exact count value
  - Increment/Decrement input with buttons
  
- **Manual Add/Subtract**: Plus/Minus buttons to adjust input value before applying

### Custom Theming
- **Color Customization**:
  - Gradient top color (default: #79bfe9)
  - Gradient bottom color (default: #f0b79a)
  - Glass morphism opacity (0.1 - 0.9)
  - Text accent color (default: #ffffff)
  
- **Theme Actions**:
  - Preview: See changes before saving
  - Save Theme: Store theme for future sessions
  - Reset Theme: Return to default colors
  
- **Persistent Themes**: Saved themes survive browser refresh

### Statistics Dashboard
- **Session Stats**: Press `s` to view
  - Total clicks in current session
  - Time elapsed
  - Average clicks per minute
  - Click history entries count
  - Session start time

### Metadata Display
- **Session Started**: When the current session began
- **Last Saved**: When data was last auto-saved
- **Auto-Save Indicator**: Visual feedback when saving

### Accessibility
- **ARIA Labels**: Proper semantic HTML and ARIA attributes
- **Keyboard Navigation**: Full keyboard support
- **Focus Visible**: Clear visual focus indicators
- **Screen Reader Support**: `aria-live` regions for announcements
- **Touch Friendly**: Minimum 44px touch targets
- **Color Contrast**: WCAG-compliant colors

### Responsive Design
- **Mobile Optimized**: Works great on phones, tablets, and desktops
- **Breakpoints**: 
  - 760px: Tablet adjustments
  - 560px: Mobile optimizations
  - 420px: Small phone specific styling
- **Adaptive Layout**: Font sizes scale with viewport
- **Touch Support**: Special handling for touch devices

## 🚀 Usage

### Getting Started
1. Open `index.html` in your browser
2. Click the big number or press `+` to increment
3. Use control buttons for quick operations
4. Open settings (⚙️) for advanced features

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `+` or `Add` | Increase by 1 |
| `-` or `Subtract` | Decrease by 1 |
| `r` | Reset to 0 |
| `z` | Undo last action |
| `s` | Show statistics |
| `e` | Export data as JSON |
| `i` | Import data from JSON |
| `Escape` | Close settings modal |

### Export/Import Workflow
1. **Export**: Press `e` or click "📥 Export" button
   - Downloads JSON file with current data
   - Filename: `clickCounter_backup_YYYY-MM-DD.json`

2. **Import**: Press `i` or click "📤 Import" button
   - Select previously exported JSON file
   - Merges count and history data
   - Preserves your session

### Theme Customization
1. Open Settings (⚙️ button)
2. Scroll to "Custom theme" section
3. Adjust colors and opacity:
   - Click color boxes to pick colors
   - Use slider for glass opacity
4. Click "Preview" to see changes
5. Click "Save Theme" to make permanent
6. Use "Reset Theme" to revert to defaults

## 💾 Storage & Persistence

### What Gets Saved?
- **Current Count** (`localStorage`)
- **Start Timestamp** (`localStorage`)
- **Click History** (up to 500 entries)
- **Theme Preferences** (persists across sessions)
- **Undo Stack** (up to 50 entries per session)

### Storage Keys
- `clickCounter_v2`: Current count and session data
- `clickCounter_startedAt`: Session start timestamp
- `clickCounter_theme_v2`: User theme preferences
- `clickCounter_history_v2`: Click history log
- `clickCounter_undo_v2`: Undo stack

## 🛠 Technical Details

### Architecture
- **IIFE**: Self-contained module pattern
- **Debounced Saves**: 500ms delay to optimize performance
- **Event Delegation**: Efficient event handling
- **DOM Caching**: All DOM elements cached for performance

### Performance Optimizations
- Debounced auto-save operations
- Lazy-loaded history rendering (50 items)
- CSS animations for smooth transitions
- Optimized re-renders
- Efficient event listeners

### Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📁 File Structure

```
ClickCounter/
├── index.html          # Main HTML structure
├── styles.css          # Enhanced CSS with responsiveness
├── app.js              # Main application logic (700+ lines)
├── logo.png            # Brand logo
├── README.md           # This file
└── LICENSE             # License information
```

## 🎨 Design Features

### Glass Morphism UI
- Frosted glass effect with backdrop blur
- Semi-transparent overlays
- Modern gradient backgrounds

### Animations
- Pulse effect on counter clicks
- Smooth transitions on buttons
- Milestone celebration animations
- Auto-save indicator fade-in/out
- Modal slide animations

### Color Scheme
- **Default Top Gradient**: Light blue (#79bfe9)
- **Default Bottom Gradient**: Peachy orange (#f0b79a)
- **Accent Colors**: White text with shadows
- **Glass Effect**: 45% opacity with blur

## 🔐 Data Privacy

- **Local Storage Only**: All data stored locally in browser
- **No Cloud Sync**: No data sent to external servers
- **User Control**: Full export/import capability
- **Session Data**: Undo stack clears on page refresh

## 🐛 Debugging

### Keyboard Shortcuts Display
Console message on load shows all available shortcuts:
```
ClickCounter initialized. Keyboard shortcuts: +/-/r/z/s/e/i
```

### Auto-Save Indicator
Visual "✓ Saved" indicator appears at bottom-right when data is saved

### Browser Console
Open DevTools to see informational and warning messages

## 📱 Mobile Usage Tips

1. **Large Touch Targets**: All buttons minimum 44px for easy tapping
2. **Portrait Orientation**: Optimized for portrait and landscape
3. **Responsive Text**: Font sizes scale with screen size
4. **No Keyboard Zoom**: Font sizes set to prevent iOS auto-zoom

## 🎯 Future Enhancements

Potential improvements for future versions:
- Cloud sync with user accounts
- Advanced analytics and graphs
- Goal setting and tracking
- Share achievements with others
- Dark/Light mode toggle
- Multiple counter instances
- Performance improvements with Web Workers

## 📝 License

Developed by Sanzid Ahmed © 2025
Licensed under MIT (see LICENSE file)

## 🤝 Contributing

Suggestions and improvements are welcome!

---

**Made with ❤️ by Sanzid Ahmed**

For the Affilancers team
