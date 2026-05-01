# Modern UI Component Reference Guide

## 🎨 Available Components

### 1. **ModernLayout**
Main layout wrapper with sidebar navigation.

```jsx
<ModernLayout activeTab={activeTab} onTabChange={setActiveTab}>
  {children}
</ModernLayout>
```

**Props:**
- `activeTab` - Current active tab ID
- `onTabChange` - Callback when tab changes
- `children` - Page content

---

### 2. **StatCard**
Display key metrics with gradients and trends.

```jsx
<StatCard
  icon="💾"
  label="Active Profiles"
  value={count}
  trend={10}
  unit="files"
  color="primary"
/>
```

**Props:**
- `icon` - Emoji or icon
- `label` - Metric label
- `value` - Metric value
- `trend` - Trend percentage (optional)
- `unit` - Unit suffix (optional)
- `color` - 'primary' | 'success' | 'accent' | 'warning' | 'danger'

---

### 3. **ActionCard**
Display actionable items with status.

```jsx
<ActionCard
  icon="💾"
  title="Profile Name"
  description="Full backup • Every daily"
  status="success"
  isActive={true}
  onAction={handleEdit}
  actionLabel="Edit"
  actionVariant="secondary"
/>
```

**Props:**
- `icon` - Emoji or icon
- `title` - Card title
- `description` - Card description
- `status` - 'success' | 'warning' | 'danger' | 'idle'
- `lastRun` - Last run time (optional)
- `isActive` - Is card active
- `onAction` - Action button callback
- `actionLabel` - Button label
- `actionVariant` - 'primary' | 'secondary' | 'danger'

---

### 4. **ModernInput**
Enhanced input field with icons and validation.

```jsx
<ModernInput
  label="Profile Name"
  placeholder="Enter name"
  value={value}
  onChange={handleChange}
  type="text"
  error={errorMessage}
  helperText="Helper text"
  size="md"
  required={true}
  disabled={false}
  icon="📝"
/>
```

**Props:**
- `label` - Input label
- `placeholder` - Placeholder text
- `value` - Input value
- `onChange` - Change handler
- `type` - Input type (default: 'text')
- `error` - Error message (shows red state)
- `helperText` - Helper text below input
- `size` - 'sm' | 'md' | 'lg'
- `required` - Show required indicator
- `disabled` - Disable input
- `icon` - Left icon emoji

---

### 5. **ModernProgressBar**
Animated progress bar with status colors.

```jsx
<ModernProgressBar
  progress={75}
  label="Uploading backup"
  status="progress"
  showPercentage={true}
  size="md"
/>
```

**Props:**
- `progress` - Progress percentage (0-100)
- `label` - Progress label
- `status` - 'progress' | 'success' | 'warning' | 'danger'
- `showPercentage` - Show percentage (default: true)
- `size` - 'sm' | 'md' | 'lg'

---

### 6. **ModernModal**
Modal dialog with animations.

```jsx
<ModernModal
  isOpen={isOpen}
  onClose={handleClose}
  title="Modal Title"
  size="md"
  closeOnBackdrop={true}
  footer={
    <>
      <button>Cancel</button>
      <button>Save</button>
    </>
  }
>
  {/* Modal content */}
</ModernModal>
```

**Props:**
- `isOpen` - Is modal open
- `onClose` - Close callback
- `title` - Modal title
- `children` - Modal content
- `footer` - Footer elements
- `size` - 'sm' | 'md' | 'lg' | 'xl'
- `closeOnBackdrop` - Close when clicking backdrop

---

### 7. **Sidebar**
Navigation sidebar.

```jsx
<Sidebar
  isOpen={true}
  items={navItems}
  activeTab={activeTab}
  onTabChange={handleTabChange}
/>
```

**Props:**
- `isOpen` - Is sidebar visible
- `items` - Navigation items array
- `activeTab` - Active tab ID
- `onTabChange` - Tab change callback

**Navigation Item Format:**
```js
{ id: 'dashboard', label: 'Dashboard', icon: '📊' }
```

---

## 🎯 CSS Classes & Utilities

### **Layout Classes**
```css
.container           /* Max-width container with padding */
.card               /* Modern card with shadow and hover */
.card-gradient      /* Gradient background card */
.card-success       /* Success gradient card */
.card-accent        /* Accent gradient card */

.sidebar            /* Sidebar styling */
.sidebar-header     /* Sidebar header styling */
.nav-item           /* Navigation item */
.nav-item.active    /* Active navigation item */

.main-content       /* Main content area */
.page-header        /* Page header section */
.page-title         /* Page title */
.page-description   /* Page description text */
```

### **Grid Classes**
```css
.grid              /* Display grid */
.grid-2            /* 2-column grid */
.grid-3            /* 3-column grid */
.grid-4            /* 4-column grid */
```

### **Button Classes**
```css
.btn-primary        /* Primary button with gradient */
.btn-secondary      /* Secondary button */
.btn-success        /* Success button */
.btn-danger         /* Danger button */
.btn-warning        /* Warning button */
.btn-ghost          /* Ghost button (transparent) */

.btn-sm             /* Small button */
.btn-lg             /* Large button */
```

### **Badge Classes**
```css
.badge              /* Badge container */
.badge-success      /* Success badge */
.badge-danger       /* Danger badge */
.badge-warning      /* Warning badge */
.badge-info         /* Info badge */
```

### **Utility Classes**
```css
.flex               /* Flexbox display */
.flex-center        /* Centered flex */
.flex-between       /* Space-between flex */
.flex-col           /* Column flex direction */

.gap-1/2/3/4/6      /* Gap utilities */
.text-center        /* Text align center */
.text-muted         /* Muted text color */
.text-sm/xs         /* Small/extra-small text */
.font-bold/semibold /* Font weights */

.mt-1/2/4           /* Margin-top */
.mb-1/2/4           /* Margin-bottom */
.p-2/4/6            /* Padding */

.rounded            /* Rounded corners */
.rounded-full       /* Fully rounded (pill) */
```

### **Animation Classes**
```css
.fade-in            /* Fade in animation */
.slide-up           /* Slide up animation */
.slide-down         /* Slide down animation */
.pulse              /* Pulsing animation */
.spin               /* Spinning animation */
```

---

## 🎨 CSS Variables

### **Colors**
```css
--primary: #3b82f6
--primary-light: #60a5fa
--primary-dark: #1d4ed8
--primary-50: #eff6ff

--accent: #8b5cf6
--success: #10b981
--danger: #ef4444
--warning: #f59e0b

--neutral-50 to --neutral-950
```

### **Gradients**
```css
--gradient-primary
--gradient-accent
--gradient-success
```

### **Spacing & Radius**
```css
--radius-sm: 0.375rem
--radius-md: 0.5rem
--radius-lg: 0.75rem
--radius-xl: 1rem
--radius-2xl: 1.5rem
```

### **Shadows**
```css
--shadow-sm
--shadow-md
--shadow-lg
--shadow-xl
--shadow-2xl
--shadow-inner
```

### **Transitions**
```css
--transition-fast: 150ms
--transition-base: 200ms
--transition-slow: 300ms
```

---

## 📝 Usage Examples

### **Dashboard Page**
```jsx
import StatCard from '../components/StatCard';

function Dashboard() {
  return (
    <div style={{ width: '100%' }}>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="grid grid-4">
        <StatCard
          icon="💾"
          label="Backups"
          value={10}
          color="primary"
        />
      </div>
    </div>
  );
}
```

### **Settings Page**
```jsx
import ModernInput from '../components/ModernInput';
import ModernModal from '../components/ModernModal';

function Settings() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <ModernInput
        label="Email"
        placeholder="your@email.com"
        icon="✉️"
      />

      <ModernModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm"
      >
        Are you sure?
      </ModernModal>
    </div>
  );
}
```

---

## 🎯 Color Usage Guide

- **Primary (Blue)**: Main actions, navigation, primary buttons
- **Success (Green)**: Successful operations, positive status
- **Danger (Red)**: Destructive actions, errors, failures
- **Warning (Orange)**: Warnings, cautions, attention needed
- **Accent (Purple)**: Secondary highlights, premium features

---

## ⚡ Performance Tips

1. Use CSS classes instead of inline styles when possible
2. Leverage animations only where needed
3. Use `grid-auto-fit` for responsive layouts
4. Keep sidebar navigation lean
5. Lazy-load heavy components

---

## 🚀 Customization

### **Change Primary Color**
Edit in `renderer/index.css`:
```css
--primary: #your-color;
--gradient-primary: linear-gradient(135deg, #your-color 0%, #darker-shade 100%);
```

### **Adjust Spacing**
```css
--radius-lg: 1rem;  /* Increase border radius */
gap: 2rem;          /* Increase gaps */
```

### **Modify Animations**
```css
--transition-base: 300ms;  /* Slower transitions */
animation: fadeIn var(--transition-slow);
```

---

## 📚 Best Practices

1. ✅ Use semantic HTML
2. ✅ Keep components reusable
3. ✅ Use CSS variables for consistency
4. ✅ Add proper error handling
5. ✅ Test accessibility
6. ✅ Optimize for performance
7. ✅ Document component props
8. ✅ Use consistent spacing

---

**Last Updated**: April 2026
**Version**: 1.0.0 Modern UI
