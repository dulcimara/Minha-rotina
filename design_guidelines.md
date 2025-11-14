# Design Guidelines: Aplicativo de Gestão de Rotina

## Color Palette
**Paleta Coral, Lavanda & Roxo**:
- **Primary**: #9C51B6 (Roxo Médio) - usado para ações principais, botões, elementos interativos
- **Secondary**: #C083D0 (Lavanda) - usado para elementos secundários, estados alternativos
- **Accent**: #FF7F52 (Coral) - usado para destaques, chamadas de ação importantes, notificações
- **Background**: #FEF0F4 (Rosa Claro) - fundo principal, cria atmosfera suave e acolhedora
- **Destrutivo**: #F28076 (Coral Salmão) - usado para ações de exclusão, alertas

**Aplicação**:
- Botões primários: roxo médio (#9C51B6)
- Floating Action Button (voz): coral (#FF7F52) para máxima visibilidade
- Badges de categoria: variações de lavanda e coral
- Cards: fundo rosa muito claro com bordas sutis

## Design Approach
**Selected Approach**: Design System + Reference Hybrid
- **Primary Reference**: Notion (organização visual limpa), Asana (clareza de tarefas), Apple Calendar (calendário intuitivo)
- **Supporting System**: Material Design 3 (componentes modernos e acessíveis)
- **Justification**: App de produtividade que precisa ser eficiente mas visualmente convidativo, com foco em usabilidade feminina sem cair em estereótipos

## Typography Hierarchy

**Font Families**:
- Primary: Inter (interface, corpo de texto, labels)
- Display: Playfair Display ou Lora (títulos principais, welcome screens)

**Scale**:
- Hero/Welcome: text-4xl md:text-5xl, font-display, font-semibold
- Page Titles: text-2xl md:text-3xl, font-semibold
- Section Headers: text-xl, font-semibold
- Activity Titles: text-base, font-medium
- Body Text: text-sm md:text-base, font-normal
- Captions/Meta: text-xs md:text-sm, font-normal

## Layout System

**Spacing Primitives**: Tailwind units 2, 4, 6, 8, 12, 16
- Card padding: p-4 md:p-6
- Section spacing: space-y-6 md:space-y-8
- Button padding: px-4 py-2 md:px-6 py-3
- Container margins: mx-4 md:mx-6 lg:mx-8

**Grid System**:
- Mobile: Single column (grid-cols-1)
- Tablet: 2 columns for activity cards (md:grid-cols-2)
- Desktop: 3 columns for quick actions, 2 for calendar+list (lg:grid-cols-3)
- Max container width: max-w-7xl mx-auto

## Core Components

### Navigation
- Fixed top bar with app logo/name, voice recording button (prominent), user profile
- Bottom navigation (mobile): Home, Calendar, Activities Library, Profile
- Sidebar (desktop): Vertical nav with icons + labels, collapsible

### Voice Recording Interface
- Floating Action Button (FAB) style, always accessible
- Pulsing animation during recording
- Waveform visualization while speaking
- Clear "Listening..." state with transcript preview
- Confirmation modal showing interpreted command before saving

### Activity Cards
- Rounded corners (rounded-lg md:rounded-xl)
- Subtle shadow (shadow-sm hover:shadow-md transition)
- Time indicator on left (vertical line + time text)
- Activity icon + title + description
- Quick actions: Edit, Delete, Mark Complete (icon buttons)
- Checkbox for completion status
- Category badge (small pill shape, rounded-full)

### Calendar View
- Month grid with day cells
- Day cells show: date number + activity count indicator (dot badges)
- Selected day highlighted with distinctive border
- Today's date emphasized
- Click day → show activities in side panel or below

### Pre-Defined Activities Library
- Grid of category cards (2-3 columns)
- Each card: Icon, Activity name, Quick-add button
- Categories: Saúde, Trabalho, Casa, Lazer, Autocuidado, Fitness
- Search/filter bar at top

### Forms
- Input fields: Rounded (rounded-lg), generous padding (p-3)
- Labels above inputs (text-sm font-medium mb-2)
- Date/time pickers: Native when possible, custom fallback
- Voice button integrated within forms as alternative input
- Clear visual feedback for required fields

### Modals/Dialogs
- Centered overlay with backdrop blur
- Max width: max-w-md md:max-w-lg
- Rounded corners (rounded-2xl)
- Header with title + close button
- Content area with appropriate padding
- Footer with action buttons (right-aligned)

### Empty States
- Icon + helpful message + CTA
- "No activities today" → Suggest adding via voice or quick actions
- "No recordings" → Guide user to record first command

## Interaction Patterns

### Voice Command Flow
1. Tap microphone → Visual feedback (pulsing animation)
2. Speak command → Live transcript display
3. Processing → Loading indicator
4. Result preview → Confirmation modal with extracted data
5. Confirm/Edit → Activity added to calendar

### Activity Management
- Swipe gestures (mobile): Swipe right to complete, swipe left for options
- Drag and drop: Reorder activities, change dates (calendar view)
- Bulk actions: Long-press to enter selection mode

## Animations
**Minimal and purposeful only**:
- Voice button pulse during recording
- Smooth transitions between views (200-300ms)
- Card hover lift effect (slight scale + shadow)
- Toast notifications slide in from top
- No scroll-triggered animations

## Responsive Breakpoints
- Mobile: < 768px (single column, bottom nav)
- Tablet: 768px - 1024px (2 columns, adapted layouts)
- Desktop: > 1024px (3 columns, sidebar nav)

## Accessibility
- All interactive elements: min-height of 44px (touch target)
- Consistent focus states: ring-2 ring-offset-2
- Voice alternative always visible and labeled
- Form inputs with aria-labels
- Color-independent status indicators (icons + text)

## Images
**No hero image needed** - this is a productivity app, not a marketing site.

**In-app imagery**:
- User profile photo (circular avatar, size-10 md:size-12)
- Activity category icons (from Heroicons, size-6)
- Empty state illustrations (simple, friendly line art - use placeholders)
- Onboarding screens: Simple illustrations showing voice feature

## Key Design Principles
1. **Clarity First**: Information hierarchy always clear, no cluttered views
2. **Touch-Friendly**: Generous tap targets, comfortable spacing
3. **Voice-Centric**: Microphone button always prominent and accessible
4. **Welcoming, Not Stereotypical**: Modern, professional aesthetic that appeals broadly
5. **Efficient**: Quick actions, minimal taps to complete tasks