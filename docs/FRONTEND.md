# Фронтенд архитектура BlockNote

## Обзор

Фронтенд BlockNote построен на **React 18+** с использованием **TypeScript**, **Vite** и **Tailwind CSS**.

---

## Технологический стек

| Технология | Версия | Назначение |
|------------|--------|------------|
| React | 18+ | UI библиотека |
| TypeScript | 5+ | Типизация |
| Vite | 5+ | Сборка и dev server |
| Tailwind CSS | 3+ | Стилизация |
| Yjs | latest | CRDT для real-time |
| WebSocket API | native | Real-time связь |

---

## Структура проекта

```
frontend/src/
├── components/
│   ├── Editor/
│   │   ├── BlockEditor.tsx      # Текстовый редактор
│   │   ├── BoardEditor.tsx      # Редактор доски
│   │   ├── ContextMenu.tsx      # Контекстное меню
│   │   ├── SlashCommandMenu.tsx # Меню команд (/)
│   │   └── FloatingToolbar.tsx  # Панель форматирования
│   ├── Sidebar/
│   │   ├── Sidebar.tsx          # Боковая панель
│   │   ├── PageTree.tsx         # Дерево страниц
│   │   └── CreatePageModal.tsx  # Модалка создания
│   ├── Layout/
│   │   ├── Layout.tsx           # Основной layout
│   │   └── Header.tsx           # Шапка
│   ├── SettingsModal.tsx        # Настройки
│   └── ShareModal.tsx           # Шеринг
├── hooks/
│   ├── usePage.ts               # Хук для работы со страницами
│   ├── useWebSocket.ts          # WebSocket хук
│   └── useS3Upload.ts           # Загрузка файлов
├── services/
│   └── api.ts                   # API клиент
├── types/
│   └── index.ts                 # TypeScript типы
├── App.tsx                      # Главный компонент
├── main.tsx                     # Точка входа
└── index.css                    # Глобальные стили
```

---

## Компоненты

### App.tsx

Главный компонент приложения, управляющий состоянием аутентификации и роутингом.

**Функционал:**
- Проверка токена аутентификации
- Рендеринг AuthScreen или основного приложения
- Управление состоянием пользователя
- Координация между компонентами

**Состояние:**
```typescript
interface AppState {
  user: User | null;
  selectedPageId: string | null;
  token: string | null;
}
```

---

### Layout Components

#### Layout.tsx

Основной layout с боковой панелью и контентной областью.

**Props:**
```typescript
interface LayoutProps {
  sidebar: React.ReactNode;
  user?: { name: string; email: string };
  onLogout: () => void;
  children: React.ReactNode;
}
```

**Структура:**
```
┌─────────────────────────────────────────┐
│              Header                     │
├─────────────┬───────────────────────────┤
│             │                           │
│   Sidebar   │        Content            │
│             │                           │
│             │                           │
└─────────────┴───────────────────────────┘
```

#### Header.tsx

Шапка приложения с информацией о пользователе.

**Функционал:**
- Отображение имени/email пользователя
- Кнопка выхода
- Название текущей страницы

---

### Editor Components

#### BlockEditor.tsx

Текстовый редактор в стиле Notion.

**Функционал:**
- Блочное редактирование
- Поддержка типов блоков:
  - `text` — обычный текст
  - `heading1`, `heading2`, `heading3` — заголовки
  - `bullet` — маркированный список
  - `numbered` — нумерованный список
  - `todo` — чекбокс
  - `quote` — цитата
  - `code` — код
  - `divider` — разделитель
  - `callout` — выноска
  - `image` — изображение

**Интерактивность:**
- **Enter** — новый блок
- **Backspace** — удаление пустого блока
- **Стрелки** — навигация между блоками
- **/** — slash command меню
- **Правый клик** — контекстное меню
- **Выделение текста** — плавающая панель

**Состояние:**
```typescript
interface BlockEditorState {
  title: string;
  blocks: Block[];
  saving: boolean;
  contextMenu: { x: number; y: number } | null;
  slashMenu: { x: number; y: number; blockId: string } | null;
  floatingToolbar: { x: number; y: number } | null;
}
```

**Структура блока:**
```typescript
interface Block {
  id: string;
  type: BlockType;
  content: string;
  properties?: Record<string, unknown>;
}
```

---

#### BoardEditor.tsx

Редактор доски в стиле FigJam/Miro.

**Функционал:**
- Бесконечный холст с панорамированием и зумом
- Инструменты:
  - `select` (V) — выделение
  - `hand` (H) — панорамирование
  - `rectangle` (R) — прямоугольник
  - `ellipse` (O) — эллипс
  - `diamond` (D) — ромб
  - `arrow` (A) — стрелка
  - `text` (T) — текст
  - `sticky` (S) — стикер
  - `pencil` (P) — рисование
  - `eraser` (E) — удаление

**Управление:**
- **Колесо мыши** — зум
- **Средняя кнопка** — панорамирование
- **Shift+клик** — мультивыделение
- **Delete/Backspace** — удаление
- **Правый клик** — контекстное меню

**Состояние:**
```typescript
interface BoardEditorState {
  boardState: {
    elements: BoardElement[];
    selectedIds: string[];
  };
  currentTool: Tool;
  currentColor: string;
  isDragging: boolean;
  isPanning: boolean;
  isDrawing: boolean;
  panOffset: { x: number; y: number };
  scale: number;
}
```

**Элемент доски:**
```typescript
interface BoardElement {
  id: string;
  type: 'rectangle' | 'ellipse' | 'diamond' | 'arrow' | 'text' | 'sticky' | 'pencil';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color: string;
  points?: { x: number; y: number }[];  // для pencil
  startPoint?: { x: number; y: number }; // для arrow
  endPoint?: { x: number; y: number };   // для arrow
}
```

**Рендеринг:**
- HTML5 Canvas для производительности
- Device pixel ratio для чёткости
- Сетка на фоне с учётом панорамирования

---

#### ContextMenu.tsx

Контекстное меню для правого клика.

**BlockEditor опции:**
- Delete
- Duplicate
- Turn into (сменить тип блока)
- Copy/Paste
- Color

**BoardEditor опции:**
- Copy
- Paste
- Delete
- Bring to front
- Send to back

**Props:**
```typescript
interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSelect: (action: string) => void;
}
```

---

#### SlashCommandMenu.tsx

Меню команд, вызываемое символом `/`.

**Команды:**
- Text
- Heading 1, 2, 3
- Bullet list
- Numbered list
- Todo
- Quote
- Code
- Divider
- Callout

**Props:**
```typescript
interface SlashCommandMenuProps {
  x: number;
  y: number;
  blockId: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}
```

**Навигация:**
- **Стрелки вверх/вниз** — выбор команды
- **Enter** — применить
- **Escape** — закрыть

---

#### FloatingToolbar.tsx

Плавающая панель форматирования текста.

**Инструменты:**
- **Bold** (Ctrl+B)
- **Italic** (Ctrl+I)
- **Underline** (Ctrl+U)
- **Strike** (Ctrl+Shift+X)
- **Code** (Ctrl+E)
- **Link** (Ctrl+K)

**Позиционирование:**
- Появляется над выделенным текстом
- Следует за выделением при скролле

---

### Sidebar Components

#### Sidebar.tsx

Боковая панель навигации.

**Функционал:**
- Список рабочих пространств
- Дерево страниц
- Кнопка создания страницы
- Поиск страниц

**Состояние:**
```typescript
interface SidebarState {
  workspaces: Workspace[];
  pages: Page[];
  selectedPageId?: string;
  expandedPages: Set<string>;
}
```

---

#### PageTree.tsx

Компонент дерева страниц с поддержкой вложенности.

**Функционал:**
- Рекурсивный рендеринг страниц
- Развёртывание/свёртывание
- Индикация текущей страницы
- Drag-and-drop (будущая реализация)

**Props:**
```typescript
interface PageTreeProps {
  pages: Page[];
  selectedPageId?: string;
  onSelectPage: (pageId: string) => void;
}
```

---

#### CreatePageModal.tsx

Модалка создания новой страницы.

**Поля:**
- Название
- Иконка (emoji picker)
- Тип страницы (text/board)
- Родительская страница (опционально)

**Props:**
```typescript
interface CreatePageModalProps {
  workspaceId: string;
  parentId?: string;
  onClose: () => void;
  onCreate: (page: CreatePageRequest) => void;
}
```

---

## Hooks

### usePage.ts

Хук для управления состоянием страницы.

**API:**
```typescript
function usePage(pageId: string | null) {
  return {
    page: PageWithContent | null;
    loading: boolean;
    error: string | null;
    updatePage: (data: { title?: string; icon?: string }) => Promise<void>;
    saveContent: (content: Uint8Array) => Promise<void>;
    reload: () => Promise<void>;
  };
}
```

**Использование:**
```typescript
const { page, loading, updatePage, saveContent } = usePage(selectedPageId);
```

---

### useWebSocket.ts

Хук для real-time синхронизации через Yjs.

**API:**
```typescript
function useWebSocket(pageId: string | null, ydoc: Y.Doc) {
  return {
    connected: boolean;
    sendUpdate: (update: Uint8Array) => void;
  };
}
```

**Логика:**
1. Подключение к WebSocket при монтировании
2. Отправка Yjs updates на сервер
3. Применение remote updates локально
4. Автоматическое переподключение

---

### useS3Upload.ts

Хук для загрузки файлов в S3.

**API:**
```typescript
function useS3Upload() {
  return {
    uploading: boolean;
    upload: (file: File, pageId: string) => Promise<string>; // returns URL
  };
}
```

**Процесс:**
1. Запрос presigned upload URL
2. PUT запрос файла на S3
3. Возврат download URL

---

## Services

### api.ts

API клиент для взаимодействия с бэкендом.

**Методы:**
```typescript
class ApiService {
  setToken(token: string | null): void;
  getToken(): string | null;
  
  // Auth
  register(data: RegisterRequest): Promise<AuthResponse>;
  login(data: LoginRequest): Promise<AuthResponse>;
  logout(): void;
  
  // Workspaces
  getWorkspaces(): Promise<Workspace[]>;
  createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace>;
  getWorkspacePages(workspaceId: string): Promise<Page[]>;
  
  // Pages
  getPage(pageId: string): Promise<PageWithContent>;
  createPage(data: CreatePageRequest): Promise<Page>;
  updatePage(pageId: string, data: UpdatePageRequest): Promise<Page>;
  deletePage(pageId: string): Promise<void>;
  updatePageContent(pageId: string, content: Uint8Array): Promise<void>;
  
  // Assets
  getUploadURL(data: GetUploadURLRequest): Promise<GetUploadURLResponse>;
  getDownloadURL(assetId: string): Promise<GetDownloadURLResponse>;
}
```

---

## Types

### Основные типы

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface Workspace {
  id: string;
  name: string;
  icon?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface Page {
  id: string;
  workspace_id: string;
  parent_id?: string;
  owner_id: string;
  title: string;
  icon?: string;
  page_type: 'text' | 'board';
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  children?: Page[];
}

interface PageWithContent extends Page {
  content: Uint8Array;
}
```

---

## State Management

### Локальное состояние компонентов

Каждый компонент управляет своим состоянием через `useState`.

### Глобальное состояние

- **Токен аутентификации** — localStorage + React state
- **Yjs документы** — Y.Doc рефы
- **Текущая страница** — App.tsx state

### Синхронизация состояния

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Component  │────▶│  usePage    │────▶│   api.ts    │
│   (State)   │◀────│   (Hook)    │◀────│  (Service)  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ useWebSocket│
                    │  (Real-time)│
                    └─────────────┘
```

---

## Real-time синхронизация

### Yjs интеграция

**Архитектура:**
```
┌──────────┐    Yjs Update    ┌──────────┐
│  Client  │─────────────────▶│  Server  │
│   Y.Doc  │◀─────────────────│   (Hub)  │
└──────────┘    Binary (WS)   └──────────┘
                                      │
                                      │ broadcast
                                      ▼
                                ┌──────────┐
                                │  Client  │
                                │   Y.Doc  │
                                └──────────┘
```

**Типы данных Yjs:**
- `Y.Text` — для текстового содержимого
- `Y.Array` — для списков блоков
- `Y.Map` — для метаданных

### Конфликт разрешение

Yjs использует CRDT (Conflict-free Replicated Data Types) для автоматического разрешения конфликтов:
- Операции коммутативны
- Порядок применения не важен
- Гарантирована консистентность

---

## Стилизация

### Tailwind CSS

**Цветовая палитра:**
```css
/* Из tailwind.config.js */
colors: {
  primary: '#0066CC',
  secondary: '#6B7280',
  success: '#10B981',
  danger: '#EF4444',
  surface: '#FFFFFF',
  background: '#F9FAFB',
  border: '#E5E7EB',
  text: {
    primary: '#111827',
    secondary: '#6B7280',
  }
}
```

**Примеры:**
```tsx
// Кнопка
<button className="px-4 py-2 bg-primary text-white rounded hover:opacity-90">
  Create
</button>

// Карточка
<div className="bg-surface border border-border rounded-lg p-4">
  Content
</div>
```

---

## Производительность

### Оптимизации

1. **React.memo** для предотвращения лишних ререндеров
2. **useCallback** для стабильных ссылок на функции
3. **useRef** для хранения mutable данных без ререндера
4. **Виртуализация** списков (будущая реализация)
5. **Code splitting** для больших компонентов

### Bundle size

- **Vite** — tree shaking и code splitting
- **Tailwind** — purge unused CSS
- **Lazy loading** для тяжёлых компонентов

---

## Тестирование

### Рекомендуемая структура тестов

```
frontend/src/
├── components/
│   └── Editor/
│       ├── BlockEditor.tsx
│       └── BlockEditor.test.tsx
├── hooks/
│   ├── usePage.ts
│   └── usePage.test.ts
└── services/
    ├── api.ts
    └── api.test.ts
```

### Инструменты

- **Vitest** — тест раннер
- **React Testing Library** — тестирование компонентов
- **MSW** — мокирование API

---

## Сборка и развертывание

### Development

```bash
npm install
npm run dev
```

### Production build

```bash
npm run build
```

### Docker

```bash
docker build -t blocknote-frontend ./frontend
docker run -p 3000:3000 blocknote-frontend
```

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `VITE_API_URL` | URL API сервера | `http://localhost:8080` |

---

## Будущие улучшения

1. **Offline режим** — Service Worker + IndexedDB
2. **PWA** — установка приложения
3. **Keyboard shortcuts** — расширенная поддержка
4. **Drag-and-drop** — для страниц и файлов
5. **Collaborative cursors** — курсоры других пользователей
6. **Comments** — система комментариев
7. **Version history** — просмотр истории изменений
8. **Export** — PDF, Markdown, HTML
