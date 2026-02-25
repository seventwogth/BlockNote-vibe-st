# Архитектура BlockNote

## Обзор проекта

**BlockNote** — это полнофункциональное веб-приложение для создания заметок с поддержкой совместной работы в реальном времени. Приложение поддерживает два режима работы:

- **Текстовый режим (Text)** — редактирование документов в стиле Notion на основе блоков
- **Режим доски (Board)** — интерактивная доска в стиле FigJam/Miro с фигурами и рисованием

---

## Технологический стек

| Слой | Технология |
|------|------------|
| **Frontend** | React 18+, TypeScript, Vite, Tailwind CSS |
| **Редактор** | Кастомный блочный редактор с Yjs |
| **Backend** | Go 1.22+ (Clean Architecture) |
| **База данных** | PostgreSQL 16 (основное хранилище) |
| **Кэш/Pub-Sub** | Redis 7 |
| **Хранилище файлов** | S3-совместимое (MinIO для dev, AWS R2 для prod) |
| **Real-time** | Yjs через WebSocket |

---

## Архитектурный паттерн

Проект использует **Clean Architecture** с dependency injection:

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Handler   │  │ Middleware  │  │   WebSocket     │  │
│  │  (HTTP/WS)  │  │   (Auth)    │  │     Hub         │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                     Business Logic Layer                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Auth      │  │  Workspace  │  │      Page       │  │
│  │  UseCase    │  │  UseCase    │  │     UseCase     │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
│  ┌─────────────┐                                         │
│  │   Asset     │                                         │
│  │  UseCase    │                                         │
│  └─────────────┘                                         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                     Data Access Layer                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │    User     │  │  Workspace  │  │      Page       │  │
│  │ Repository  │  │ Repository  │  │    Repository   │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
│  ┌─────────────┐                                         │
│  │    Asset    │                                         │
│  │ Repository  │                                         │
│  └─────────────┘                                         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  PostgreSQL │  │    Redis    │  │   S3 (MinIO)    │  │
│  │  (Database) │  │   (Cache)   │  │    (Storage)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Структура проекта

```
notion/
├── backend/                    # Go бэкенд
│   ├── cmd/
│   │   └── api/
│   │       └── main.go        # Точка входа приложения
│   ├── config/
│   │   └── config.go          # Конфигурация приложения
│   ├── internal/
│   │   ├── entity/            # Доменные сущности
│   │   │   ├── user.go        # Сущность пользователя
│   │   │   ├── workspace.go   # Сущность рабочего пространства
│   │   │   ├── page.go        # Сущность страницы
│   │   │   └── asset.go       # Сущность файла
│   │   ├── handler/           # HTTP/WebSocket обработчики
│   │   │   ├── auth_handler.go
│   │   │   ├── workspace_handler.go
│   │   │   ├── page_handler.go
│   │   │   ├── asset_handler.go
│   │   │   └── websocket_handler.go
│   │   ├── middleware/        # HTTP middleware
│   │   │   └── auth_middleware.go
│   │   ├── usecase/           # Бизнес-логика
│   │   │   ├── auth_usecase.go
│   │   │   ├── workspace_usecase.go
│   │   │   ├── page_usecase.go
│   │   │   └── asset_usecase.go
│   │   ├── repository/        # Доступ к данным
│   │   │   ├── user_repository.go
│   │   │   ├── workspace_repository.go
│   │   │   ├── page_repository.go
│   │   │   └── asset_repository.go
│   │   └── service/           # Внешние сервисы
│   │       ├── jwt_service.go
│   │       └── s3_service.go
│   ├── schema.sql             # SQL схема БД
│   ├── Dockerfile
│   ├── go.mod
│   └── go.sum
│
├── frontend/                   # React фронтенд
│   ├── src/
│   │   ├── components/
│   │   │   ├── Editor/        # Редакторы
│   │   │   │   ├── BlockEditor.tsx    # Текстовый редактор
│   │   │   │   ├── BoardEditor.tsx    # Редактор доски
│   │   │   │   ├── ContextMenu.tsx    # Контекстное меню
│   │   │   │   ├── SlashCommandMenu.tsx # Меню команд
│   │   │   │   └── FloatingToolbar.tsx # Панель форматирования
│   │   │   ├── Sidebar/       # Боковая панель
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── PageTree.tsx
│   │   │   │   └── CreatePageModal.tsx
│   │   │   ├── Layout/        # Layout компоненты
│   │   │   │   ├── Layout.tsx
│   │   │   │   └── Header.tsx
│   │   │   ├── SettingsModal.tsx
│   │   │   └── ShareModal.tsx
│   │   ├── hooks/             # React хуки
│   │   │   ├── usePage.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── useS3Upload.ts
│   │   ├── services/          # API клиент
│   │   │   └── api.ts
│   │   ├── types/             # TypeScript типы
│   │   │   └── index.ts
│   │   ├── App.tsx            # Главный компонент
│   │   ├── main.tsx           # Точка входа
│   │   └── index.css          # Глобальные стили
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── Dockerfile
│
├── docs/                       # Документация
│   ├── ARCHITECTURE.md        # Этот файл
│   ├── API.md                 # API документация
│   ├── DATABASE.md            # Схема БД
│   └── FRONTEND.md            # Фронтенд архитектура
│
├── docker-compose.yml          # Docker конфигурация
├── SPEC.md                     # Спецификация проекта
└── README.md                   # Главная документация
```

---

## Поток данных

### 1. Аутентификация

```
┌──────────┐     POST /api/auth/register     ┌──────────┐
│  Client  │ ───────────────────────────────▶│  Handler │
│          │                                 │  (Auth)  │
│          │ ◀───────────────────────────────│          │
│          │     { token, user }             │          │
└──────────┘                                 └────┬─────┘
                                                  │
                                                  ▼
                                         ┌──────────────┐
                                         │  UseCase     │
                                         │  (Register)  │
                                         └──────┬───────┘
                                                  │
                                                  ▼
                                         ┌──────────────┐
                                         │ Repository   │
                                         │  (Create)    │
                                         └──────┬───────┘
                                                  │
                                                  ▼
                                         ┌──────────────┐
                                         │  PostgreSQL  │
                                         └──────────────┘
```

### 2. Создание страницы

```
┌──────────┐     POST /api/pages           ┌──────────┐
│  Client  │ ─────────────────────────────▶│  Handler │
│          │  { workspace_id, page_type }  │  (Page)  │
│          │                               │          │
│          │ ◀─────────────────────────────│          │
│          │     { page }                  │          │
└──────────┘                               └────┬─────┘
                                                │
                                                ▼
                                       ┌──────────────┐
                                       │  UseCase     │
                                       │  (Create)    │
                                       └──────┬───────┘
                                                │
                                                ▼
                                       ┌──────────────┐
                                       │ Repository   │
                                       │  (Insert)    │
                                       └──────┬───────┘
                                                │
                                                ▼
                                       ┌──────────────┐
                                       │  PostgreSQL  │
                                       └──────────────┘
```

### 3. Real-time синхронизация (Yjs)

```
┌──────────┐    WS /api/ws/pages/:id     ┌──────────┐
│ Client 1 │ ◀─────────────────────────▶│   Hub    │
│          │     Binary (Yjs Update)     │          │
└──────────┘                             └────┬─────┘
                                              │ broadcast
                                              │
┌──────────┐                                  │
│ Client 2 │ ◀───────────────────────────────┘
│          │     Binary (Yjs Update)
└──────────┘
```

### 4. Загрузка файлов (S3)

```
┌──────────┐  POST /api/assets/upload-url  ┌──────────┐
│  Client  │ ─────────────────────────────▶│  Handler │
│          │  { filename, mime_type }      │  (Asset) │
│          │                               │          │
│          │ ◀─────────────────────────────│          │
│          │  { upload_url, asset_id }     │          │
└────┬─────┘                               └──────────┘
     │
     │ PUT {upload_url}
     ▼
┌──────────┐
│   S3     │
│ (MinIO)  │
└──────────┘
```

---

## Компоненты системы

### Backend компоненты

#### 1. **Handler** (Обработчики)
- Приём HTTP запросов
- Валидация входных данных
- Вызов UseCase
- Формирование HTTP ответа

#### 2. **UseCase** (Бизнес-логика)
- Реализация бизнес-правил
- Координация между Repository
- Обработка ошибок предметной области

#### 3. **Repository** (Репозитории)
- CRUD операции с БД
- Маппинг между БД и сущностями
- Изоляция доступа к данным

#### 4. **Service** (Сервисы)
- JWT генерация/валидация
- S3 операции (загрузка, скачивание)
- Внешние интеграции

#### 5. **Middleware** (Посредники)
- Аутентификация запросов
- Логирование
- Обработка CORS

### Frontend компоненты

#### 1. **Editor Components**
- `BlockEditor.tsx` — текстовый редактор
- `BoardEditor.tsx` — редактор доски
- `ContextMenu.tsx` — контекстное меню
- `SlashCommandMenu.tsx` — меню команд
- `FloatingToolbar.tsx` — панель форматирования

#### 2. **Sidebar Components**
- `Sidebar.tsx` — боковая навигация
- `PageTree.tsx` — дерево страниц
- `CreatePageModal.tsx` — создание страницы

#### 3. **Layout Components**
- `Layout.tsx` — основной layout
- `Header.tsx` — шапка приложения

#### 4. **Hooks**
- `usePage.ts` — управление страницами
- `useWebSocket.ts` — real-time синхронизация
- `useS3Upload.ts` — загрузка файлов

---

## Безопасность

### Аутентификация
- JWT токены для аутентификации
- Bcrypt хеширование паролей
- Middleware защита endpoints

### Авторизация
- Проверка прав доступа к workspace
- Ролевая модель (owner, admin, editor, viewer)
- Проверка владельца страницы

### Данные
- Prepared statements (защита от SQL injection)
- Валидация входных данных
- CORS политика

---

## Масштабирование

### Горизонтальное масштабирование
- Stateless backend (можно запускать несколько инстансов)
- Redis для сессий и кэша
- WebSocket Hub требует sticky sessions или external pub/sub

### Вертикальное масштабирование
- PostgreSQL connection pooling
- Redis для кэширования частых запросов
- S3 для хранения файлов

---

## Развертывание

### Development
```bash
docker-compose up
```

### Production
1. Сборка образов
2. Настройка переменных окружения
3. Запуск через docker-compose или Kubernetes
4. Настройка reverse proxy (nginx)

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://blocknote:blocknote@localhost:5432/blocknote` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Секретный ключ JWT | `your-secret-key-change-in-production` |
| `S3_ENDPOINT` | S3 endpoint | `http://localhost:9000` |
| `S3_BUCKET` | S3 bucket name | `blocknote` |
| `S3_ACCESS_KEY` | S3 access key | `minioadmin` |
| `S3_SECRET_KEY` | S3 secret key | `minioadmin` |
| `SERVER_PORT` | Порт сервера | `8080` |

---

## Мониторинг и логирование

### Логирование
- Логирование HTTP запросов
- Логирование ошибок
- Логирование WebSocket подключений

### Метрики (будущая реализация)
- Количество активных пользователей
- Количество страниц
- Время ответа API
- WebSocket подключения

---

## Будущие улучшения

1. **Redis Pub/Sub** для WebSocket в кластере
2. **Rate limiting** для API endpoints
3. **GraphQL** для сложных запросов
4. **Full-text search** для поиска по страницам
5. **Version history** для отслеживания изменений
6. **Comments** для совместной работы
7. **Export/Import** (PDF, Markdown)
