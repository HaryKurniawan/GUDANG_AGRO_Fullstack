# GUDANG Frontend Layout Implementation

## Overview

Implementasi layout sidebar untuk GUDANG frontend yang mengikuti standar ECOMMERCE operational dashboard dengan adaptasi untuk warna brand emerald.

## Components Created

### 1. **AppSidebar.tsx**
- **Location**: `src/components/layout/AppSidebar.tsx`
- **Purpose**: Generic reusable sidebar component (copy dari ECOMMERCE dengan adaptasi React Router)
- **Key Features**:
  - Support untuk group menu dengan expand/collapse
  - Desktop responsive (220px normal, 64px collapsed)
  - Mobile support dengan overlay drawer
  - Theme support (emerald, blue, indigo)
  - Active route detection menggunakan React Router hooks
  - Smooth transitions dan animations
  - Accordion-style submenu (hanya 1 group bisa expand sekaligus)

### 2. **GudangSidebar.tsx**
- **Location**: `src/components/layout/GudangSidebar.tsx`
- **Purpose**: Warehouse-specific sidebar component dengan menu items untuk admin dan staf gudang
- **Menu Structure**:
  ```
  Dashboard
  Penerimaan (dengan sub: Daftar Penerimaan, Grading)
  Pengajuan Stok (dengan sub: Daftar Pengajuan, Manajemen Stok)
  Produk & Katalog (dengan sub: Katalog Produk, Permintaan Pengadaan)
  Toko Afiliasi (dengan sub: Daftar Toko)
  Profil Gudang
  Master Komoditas (dengan sub: Data Komoditas)
  Laporan (dengan sub: Inventory, Penerimaan, Pengajuan)
  Pengaturan
  ```
- **Features**:
  - Role-based subtitle (Admin Gudang, Staf Gudang, Warehouse)
  - Emerald color theme sebagai brand color GUDANG
  - Logout functionality dengan redirect ke login
  - Header icon (BookOpen dari lucide-react)

### 3. **App.tsx Updated**
- **Changes**:
  - Replace old `Sidebar` component dengan `GudangSidebar`
  - Update comments untuk reflect "Emerald Sidebar navigation for Gudang"
  - Maintain existing route structure dan protected routes

## Color Scheme (Emerald Brand)

Menggunakan emerald color palette sesuai brand GUDANG:
- **Primary**: `emerald-500` / `emerald-600` (active states)
- **Light**: `emerald-50` / `emerald-100` (backgrounds)
- **Dark**: `emerald-700` (text)

### Tailwind Classes Used:
```
- text-emerald-700      // Active text
- bg-emerald-50        // Light backgrounds
- bg-emerald-100       // Active backgrounds
- text-emerald-600     // Icon colors
- border-emerald-200   // Subtle borders
```

## Menu Icons (from lucide-react)

- **Dashboard**: `LayoutDashboard`
- **Penerimaan**: `Truck`
- **Pengajuan Stok**: `ClipboardList`
- **Produk & Katalog**: `Package`
- **Toko Afiliasi**: `Store`
- **Profil Gudang**: `ShoppingBag`
- **Master Komoditas**: `Layers`
- **Laporan**: `BarChart3`
- **Pengaturan**: `Settings`

## Typography & Styling

Mengikuti standar ECOMMERCE:
- **Font**: Tailwind default (sans-serif)
- **Active Menu**: White background dengan emerald text, subtle shadow
- **Inactive Menu**: Gray text dengan hover states
- **Sub-items**: Smaller text (12.5px), left-bordered, indent styling
- **Spacing**: Consistent 3px padding, rounded corners (11px)

## Responsive Behavior

### Desktop (lg and up)
- Sidebar fixed left, 220px wide (collapsed: 64px)
- Smooth width transition
- Sticky positioning

### Mobile (below lg)
- Sidebar hidden by default
- Menu button (hamburger) at top-left
- Overlay drawer when opened
- Full height mobile drawer with close button
- Backdrop blur when open

## Active Route Detection

The sidebar intelligently detects active routes:
- Matches exact path and prefix paths
- Automatically expands the group containing the active route
- Shows most specific match (e.g., if both `/pengajuan` and `/pengajuan/:id` match, `/pengajuan/:id` is shown as active)

## Integration Points

### AuthStore
- Uses `useAuthStore` untuk:
  - User role detection (ADMIN_GUDANG, STAF_GUDANG)
  - Logout function
  - User information display

### React Router
- Uses `useNavigate()` untuk navigation
- Uses `useLocation()` untuk pathname detection
- Supports dynamic routes dengan params (`:id`)

## Tailwind Configuration Required

Ensure your `tailwind.config.ts` includes:
```typescript
{
  theme: {
    extend: {
      colors: {
        emerald: colors.emerald,
        primary: colors.emerald, // Optional: map primary to emerald
      }
    }
  }
}
```

## Future Enhancements

1. **Add notifications badge** to menu items (e.g., pending stock requests count)
2. **Keyboard shortcuts** untuk quick navigation
3. **Search functionality** dalam menu
4. **User profile dropdown** di header
5. **Theme switcher** untuk alternate color schemes
6. **Breadcrumb navigation** untuk context awareness

## Testing Checklist

- [ ] Sidebar renders correctly di desktop dan mobile
- [ ] Active routes highlight properly
- [ ] Menu groups expand/collapse smoothly
- [ ] Sidebar collapse toggle works
- [ ] Mobile drawer opens/closes
- [ ] Logout redirects ke login
- [ ] All menu items navigate ke correct routes
- [ ] Responsive design works di berbagai screen sizes
- [ ] Accessibility: keyboard navigation supported

## File Structure

```
src/components/layout/
├── AppSidebar.tsx          # Generic sidebar component
├── GudangSidebar.tsx       # Warehouse-specific sidebar
├── Topbar.tsx              # Existing topbar (unchanged)
└── Sidebar.tsx             # Old sidebar (dapat dihapus jika sudah tidak digunakan)
```
