# GUDANG Sidebar Menu Reference

## Menu Hierarchy

```
┌─ GUDANG (Header)
│  └─ Admin Gudang (Subtitle)
│
├─ 📊 Dashboard
│  └─ /dashboard
│
├─ 🚚 Penerimaan (Receiving)
│  ├─ Daftar Penerimaan → /penerimaan
│  └─ Grading → /penerimaan/:id/grading
│
├─ 📋 Pengajuan Stok (Stock Requests)
│  ├─ Daftar Pengajuan → /pengajuan
│  └─ Manajemen Stok → /stok
│
├─ 📦 Produk & Katalog
│  ├─ Katalog Produk → /produk
│  └─ Permintaan Pengadaan → /permintaan-pengadaan
│
├─ 🏪 Toko Afiliasi
│  └─ Daftar Toko → /toko-afiliasi
│
├─ 🏢 Profil Gudang
│  └─ /profil-gudang
│
├─ 📚 Master Komoditas
│  └─ Data Komoditas → /admin/master-komoditas
│
├─ 📈 Laporan
│  ├─ Laporan Inventory → /laporan
│  ├─ Laporan Penerimaan → /laporan/penerimaan
│  └─ Laporan Pengajuan → /laporan/pengajuan
│
└─ ⚙️ Pengaturan
   └─ /pengaturan
```

## Route Mapping

| Menu Item | Icon | Route | Type |
|-----------|------|-------|------|
| Dashboard | LayoutDashboard | `/dashboard` | Single |
| Penerimaan | Truck | `/penerimaan` | Group |
| ├─ Daftar Penerimaan | - | `/penerimaan` | Sub |
| ├─ Grading | - | `/penerimaan/:id/grading` | Sub |
| Pengajuan Stok | ClipboardList | `/pengajuan` | Group |
| ├─ Daftar Pengajuan | - | `/pengajuan` | Sub |
| ├─ Manajemen Stok | - | `/stok` | Sub |
| Produk & Katalog | Package | `/produk` | Group |
| ├─ Katalog Produk | - | `/produk` | Sub |
| ├─ Permintaan Pengadaan | - | `/permintaan-pengadaan` | Sub |
| Toko Afiliasi | Store | `/toko-afiliasi` | Group |
| ├─ Daftar Toko | - | `/toko-afiliasi` | Sub |
| Profil Gudang | ShoppingBag | `/profil-gudang` | Single |
| Master Komoditas | Layers | `/master-komoditas` | Group |
| ├─ Data Komoditas | - | `/admin/master-komoditas` | Sub |
| Laporan | BarChart3 | `/laporan` | Group |
| ├─ Laporan Inventory | - | `/laporan` | Sub |
| ├─ Laporan Penerimaan | - | `/laporan/penerimaan` | Sub |
| ├─ Laporan Pengajuan | - | `/laporan/pengajuan` | Sub |
| Pengaturan | Settings | `/pengaturan` | Single |

## Active Route Highlighting Logic

### Rules:
1. **Single Menu Item** (no children):
   - Active jika pathname exact match atau starts dengan path
   - Contoh: `/dashboard` atau `/dashboard/*` → Dashboard highlight

2. **Menu Group** (dengan children):
   - Group highlight jika salah satu sub-item active
   - Accordion auto-expand ke group yang active
   - Contoh: Navigasi ke `/penerimaan/123/grading` → Penerimaan group expand + Grading sub-item highlight

3. **Most Specific Match**:
   - Jika ada multiple path match, pilih yang paling specific (longest)
   - Contoh: `/pengajuan` vs `/pengajuan/123` → choose `/pengajuan/123`

### Examples:

```
Current Route: /dashboard
├─ Dashboard ✓ ACTIVE
└─ Semua group dan item lain: inactive

Current Route: /penerimaan
├─ Penerimaan ✓ ACTIVE (group expanded)
├─ ├─ Daftar Penerimaan ✓ ACTIVE (sub-item)
├─ ├─ Grading: inactive
└─ Semua item lain: inactive

Current Route: /penerimaan/42/grading
├─ Penerimaan ✓ ACTIVE (group expanded)
├─ ├─ Daftar Penerimaan: inactive
├─ ├─ Grading ✓ ACTIVE (sub-item)
└─ Semua item lain: inactive

Current Route: /produk
├─ Produk & Katalog ✓ ACTIVE (group expanded)
├─ ├─ Katalog Produk ✓ ACTIVE (sub-item)
├─ ├─ Permintaan Pengadaan: inactive
└─ Semua item lain: inactive

Current Route: /admin/master-komoditas
├─ Master Komoditas ✓ ACTIVE (group expanded)
├─ ├─ Data Komoditas ✓ ACTIVE (sub-item)
└─ Semua item lain: inactive

Current Route: /laporan/penerimaan
├─ Laporan ✓ ACTIVE (group expanded)
├─ ├─ Laporan Inventory: inactive
├─ ├─ Laporan Penerimaan ✓ ACTIVE (sub-item)
├─ ├─ Laporan Pengajuan: inactive
└─ Semua item lain: inactive
```

## Role-Based Display

### Admin Gudang
- Subtitle: "Admin Gudang"
- All menu items visible
- Access to `/admin/*` routes

### Staf Gudang
- Subtitle: "Staf Gudang"
- All menu items visible (role-based access control handled by backend)
- Limited access to `/admin/*` routes (handled by AdminRoute guard in App.tsx)

### Display Logic:
```typescript
getRoleLabel() {
  if (!user) return 'Warehouse';
  switch (user.peran) {
    case 'ADMIN_GUDANG': return 'Admin Gudang';
    case 'STAF_GUDANG': return 'Staf Gudang';
    default: return 'Warehouse';
  }
}
```

## Visual States

### Active Menu Item
```
┌─────────────────────────────┐
│ 📊 Dashboard                │ ← bg-white, text-emerald-700
│    border: 1px gray-100     │   font-semibold, shadow-sm
│    rounded: 11px            │
└─────────────────────────────┘
```

### Inactive Menu Item
```
┌─────────────────────────────┐
│ 🚚 Penerimaan               │ ← text-gray-500
│    hover: bg-white          │   hover: text-gray-800
│    rounded: 11px            │
└─────────────────────────────┘
```

### Active Sub-Item
```
├─ Daftar Penerimaan  ✓  ← text-emerald-700, font-semibold
│  (small text, no bg)        text-[12.5px]
│  border-left active         no background
```

### Inactive Sub-Item
```
├─ Grading               ← text-gray-400
│  (small text)              text-[12.5px]
│  border-left               hover: text-gray-700
```

## Styling Customization

### To change colors globally:
1. Open `src/components/layout/AppSidebar.tsx`
2. Modify the `accent` object in the `emerald` theme:

```typescript
emerald: {
  active: 'bg-white text-emerald-700 shadow-sm border border-gray-100',  // Active menu bg
  icon: 'text-emerald-600',                                              // Active icon color
  iconActiveBg: 'bg-emerald-100',                                        // Active icon background
  subActive: 'text-emerald-700 font-semibold',                          // Active sub-item text
  hover: 'hover:bg-white hover:text-gray-800',                          // Hover state
  // ... more
}
```

3. Or change theme prop di GudangSidebar:
```typescript
<AppSidebar
  // ...
  theme="emerald"  // Change to "blue" atau "indigo" jika diinginkan
  // ...
/>
```

## Responsive Behavior

### Desktop (lg breakpoint and up)
- Sidebar width: 220px (expanded) or 64px (collapsed)
- Always visible
- Sticky positioning
- Smooth collapse/expand animation

### Tablet (md breakpoint)
- Sidebar width: 220px (expanded) or 64px (collapsed)
- Same as desktop

### Mobile (below md breakpoint)
- Hamburger button at top-left
- Sidebar hidden by default
- Overlay drawer (w-64) when opened
- Full-height mobile drawer
- Backdrop blur effect
- Close button in drawer

## Accessibility Features

✅ **Keyboard Navigation**:
- Tab through menu items
- Enter/Space to activate
- Arrow keys untuk expand/collapse groups (future enhancement)

✅ **Screen Readers**:
- Button elements (not divs)
- Proper ARIA labels (title attributes for collapsed mode)
- Semantic HTML

✅ **Visual Indicators**:
- Clear active states dengan color + styling
- Focus states visible
- Icons + text labels

## Performance Metrics

- Component size: ~2.5KB (gzipped)
- Render optimization: Proper React hooks, no unnecessary re-renders
- CSS: Tailwind utility classes (tree-shaken)
- Animations: GPU-accelerated (transform, opacity)

## Code Examples

### Adding a new menu item:

```typescript
// In GudangSidebar.tsx
const GUDANG_MENU: SidebarMenuItem[] = [
  // ... existing items
  {
    path: '/inventory',
    label: 'Inventory Baru',
    icon: <PackageOpen size={17} />,
    children: [
      { path: '/inventory/list', label: 'Daftar Inventory' },
      { path: '/inventory/adjust', label: 'Adjustment' },
    ],
  },
];
```

### Customizing header icon:

```typescript
// In App.tsx or anywhere using GudangSidebar
<GudangSidebar 
  headerIcon={<Warehouse size={18} className="text-emerald-600" />}
/>
```

### Changing theme:

```typescript
// In GudangSidebar.tsx
<AppSidebar
  // ...
  theme="blue"  // atau "indigo"
  // ...
/>
```

## Troubleshooting

### Issue: Menu tidak highlight saat navigasi
**Solution**: Pastikan route di menu match dengan route di App.tsx routes definition

### Issue: Icon tidak muncul
**Solution**: Pastikan lucide-react ter-import dan ikon name benar

### Issue: Sidebar tidak responsive
**Solution**: Pastikan Tailwind lg breakpoint dikonfigurasi di tailwind.config.js (default: 1024px)

### Issue: Warna emerald tidak muncul
**Solution**: Pastikan Tailwind CSS terintegrasi (jangan lupa `@tailwind` directives di index.css)

## Future Enhancements

1. **Notification Badges**:
   ```typescript
   {
     path: '/pengajuan',
     label: 'Pengajuan Stok',
     icon: <ClipboardList size={17} />,
     badge: 5,  // Shows "5" badge
   }
   ```

2. **Keyboard Shortcuts**:
   ```typescript
   {
     path: '/dashboard',
     label: 'Dashboard',
     icon: <LayoutDashboard size={17} />,
     shortcut: 'Cmd+D',  // Show shortcut hint
   }
   ```

3. **Search Menu**:
   - Add search box in sidebar header
   - Filter menu items while typing
   - Navigate to item with Enter

4. **Theme Switcher**:
   - Toggle between emerald/blue/indigo themes
   - Persist preference to localStorage

5. **Collapsible Dividers**:
   - Add visual separators antara menu groups
   - Useful untuk UI organization
