# Документация BlockNote

Эта папка содержит полную документацию проекта BlockNote.

---

## 📚 Документы

### 1. [ARCHITECTURE.md](./ARCHITECTURE.md) — Архитектура системы

**Содержание:**
- Обзор проекта и технологический стек
- Архитектурный паттерн Clean Architecture
- Структура проекта (backend/frontend)
- Поток данных (аутентификация, создание страниц, real-time, загрузка файлов)
- Компоненты системы (handler, usecase, repository, service, middleware)
- Frontend компоненты (редакторы, sidebar, hooks)
- Безопасность
- Масштабирование
- Развертывание
- Переменные окружения

**Для кого:** Архитекторы, backend/frontend разработчики

---

### 2. [API.md](./API.md) — API документация

**Содержание:**
- Полная спецификация REST API endpoints
- Форматы запросов и ответов
- Коды ошибок
- WebSocket API для real-time синхронизации
- Примеры использования через curl
- Аутентификация и авторизация

**Endpoints:**
- `/api/auth/*` — аутентификация
- `/api/workspaces/*` — рабочие пространства
- `/api/pages/*` — страницы
- `/api/assets/*` — файлы
- `WS /api/ws/pages/:id` — WebSocket

**Для кого:** Backend/frontend разработчики, интеграции

---

### 3. [DATABASE.md](./DATABASE.md) — База данных

**Содержание:**
- ER-диаграмма
- Описание всех таблиц (users, workspaces, workspace_members, pages, page_contents, assets)
- Связи между таблицами
- Индексы
- Триггеры
- Каскадное удаление
- Примеры SQL запросов
- Миграции
- Бэкап и восстановление
- Производительность и мониторинг

**Для кого:** Backend разработчики, DBA

---

### 4. [FRONTEND.md](./FRONTEND.md) — Фронтенд архитектура

**Содержание:**
- Технологический стек (React, TypeScript, Vite, Tailwind)
- Структура проекта
- Описание всех компонентов:
  - Editor (BlockEditor, BoardEditor, ContextMenu, SlashCommandMenu, FloatingToolbar)
  - Sidebar (Sidebar, PageTree, CreatePageModal)
  - Layout (Layout, Header)
- React hooks (usePage, useWebSocket, useS3Upload)
- API сервис
- TypeScript типы
- Real-time синхронизация с Yjs
- Стилизация Tailwind CSS
- Производительность
- Тестирование
- Сборка и развертывание

**Для кого:** Frontend разработчики

---

### 5. [SPEC.md](./SPEC.md) — Спецификация проекта

**Содержание:**
- Требования к проекту
- Описание функциональности
- Типы страниц (text/board)
- Acceptance criteria
- Заметки по реализации

**Для кого:** Проектные менеджеры, разработчики, тестировщики

---

## 🔗 Быстрые ссылки

| Документ | Описание |
|----------|----------|
| [📐 Архитектура](./ARCHITECTURE.md) | Общая архитектура системы |
| [🔌 API](./API.md) | REST API и WebSocket |
| [🗄️ База данных](./DATABASE.md) | Схема БД и SQL |
| [🎨 Фронтенд](./FRONTEND.md) | React компоненты и хуки |
| [📋 Спецификация](./SPEC.md) | Требования и функциональность |
| [📖 README](../README.md) | Главная документация (в корне) |

---

## 📖 Как использовать

### Для новых разработчиков

1. Начните с [README.md](../README.md) для общего ознакомления
2. Прочитайте [SPEC.md](./SPEC.md) для понимания функциональности
3. Изучите [ARCHITECTURE.md](./ARCHITECTURE.md) для понимания архитектуры

### Для backend разработчиков

1. [ARCHITECTURE.md](./ARCHITECTURE.md) — backend компоненты
2. [API.md](./API.md) — endpoints и форматы
3. [DATABASE.md](./DATABASE.md) — схема БД и запросы

### Для frontend разработчиков

1. [ARCHITECTURE.md](./ARCHITECTURE.md) — общие компоненты
2. [FRONTEND.md](./FRONTEND.md) — детальная фронтенд архитектура
3. [API.md](./API.md) — API для интеграции

### Для тестировщиков

1. [SPEC.md](./SPEC.md) — требования и acceptance criteria
2. [API.md](./API.md) — endpoints для тестирования

---

## 📝 Обновление документации

При внесении изменений в код обновляйте соответствующую документацию:

| Изменение в коде | Обновить документ |
|-----------------|-------------------|
| Новый endpoint | API.md |
| Изменение схемы БД | DATABASE.md |
| Новый компонент | FRONTEND.md |
| Новая фича | SPEC.md, ARCHITECTURE.md |

---

## 🤝 Вклад

Если вы нашли ошибку или хотите дополнить документацию:

1. Откройте issue с описанием
2. Или создайте PR с изменениями

---

## 📞 Вопросы

- **GitHub Issues:** [../../issues](../../issues)
- **Email:** support@blocknote.example.com
