# API Документация BlockNote

## Обзор

API приложения BlockNote построено на REST архитектуре с использованием WebSocket для real-time синхронизации.

**Base URL:** `http://localhost:8080/api`

---

## Аутентификация

### POST /auth/register

Регистрация нового пользователя.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar_url": null,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Response (409 Conflict):**
```
User already exists
```

---

### POST /auth/login

Вход пользователя.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar_url": null,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Response (401 Unauthorized):**
```
Invalid credentials
```

---

## Рабочие пространства (Workspaces)

### GET /workspaces

Получение списка рабочих пространств пользователя.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Personal",
    "icon": "📔",
    "owner_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

---

### POST /workspaces

Создание нового рабочего пространства.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "Team Workspace",
  "icon": "🚀"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "Team Workspace",
  "icon": "🚀",
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### GET /workspaces/:id

Получение информации о рабочем пространстве.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Personal",
  "icon": "📔",
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Response (404 Not Found):**
```
Workspace not found
```

---

### GET /workspaces/:id/members

Получение рабочего пространства с участниками.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Personal",
  "icon": "📔",
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "members": [
    {
      "workspace_id": "550e8400-e29b-41d4-a716-446655440001",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "role": "owner",
      "created_at": "2024-01-15T10:30:00Z",
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "name": "John Doe"
      }
    }
  ]
}
```

---

### POST /workspaces/:id/invite

Приглашение пользователя в рабочее пространство.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "email": "colleague@example.com",
  "role": "editor"
}
```

**Response (201 Created):**
```json
{
  "workspace_id": "550e8400-e29b-41d4-a716-446655440001",
  "user_id": "550e8400-e29b-41d4-a716-446655440003",
  "role": "editor",
  "created_at": "2024-01-15T11:00:00Z"
}
```

**Response (404 Not Found):**
```
User not found
```

**Response (403 Forbidden):**
```
Not authorized to invite users
```

**Response (409 Conflict):**
```
User is already a member
```

---

### DELETE /workspaces/:id/members/:memberId

Удаление участника из рабочего пространства.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (204 No Content):**

---

### PUT /workspaces/:id/members/:memberId

Изменение роли участника.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "role": "admin"
}
```

**Response (200 OK):**

---

### GET /workspaces/:id/pages

Получение списка страниц рабочего пространства.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "workspace_id": "550e8400-e29b-41d4-a716-446655440001",
    "parent_id": null,
    "owner_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Meeting Notes",
    "icon": "📝",
    "page_type": "text",
    "is_archived": false,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "children": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440011",
        "workspace_id": "550e8400-e29b-41d4-a716-446655440001",
        "parent_id": "550e8400-e29b-41d4-a716-446655440010",
        "owner_id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Subpage",
        "icon": null,
        "page_type": "text",
        "is_archived": false,
        "created_at": "2024-01-15T10:35:00Z",
        "updated_at": "2024-01-15T10:35:00Z"
      }
    ]
  }
]
```

---

## Страницы (Pages)

### POST /pages

Создание новой страницы.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "workspace_id": "550e8400-e29b-41d4-a716-446655440001",
  "parent_id": "550e8400-e29b-41d4-a716-446655440010",
  "title": "New Page",
  "icon": "📄",
  "page_type": "text"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440012",
  "workspace_id": "550e8400-e29b-41d4-a716-446655440001",
  "parent_id": "550e8400-e29b-41d4-a716-446655440010",
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "New Page",
  "icon": "📄",
  "page_type": "text",
  "is_archived": false,
  "created_at": "2024-01-15T12:00:00Z",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

**Возможные значения `page_type`:**
- `text` — текстовый документ (Notion-like)
- `board` — доска (FigJam-like)

---

### GET /pages/:id

Получение страницы с содержимым.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "workspace_id": "550e8400-e29b-41d4-a716-446655440001",
  "parent_id": null,
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Meeting Notes",
  "icon": "📝",
  "page_type": "text",
  "is_archived": false,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "content": "base64_encoded_yjs_binary_data..."
}
```

**Response (404 Not Found):**
```
Page not found
```

---

### PUT /pages/:id

Обновление метаданных страницы.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "title": "Updated Title",
  "icon": "🎯",
  "is_archived": true
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "workspace_id": "550e8400-e29b-41d4-a716-446655440001",
  "parent_id": null,
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Updated Title",
  "icon": "🎯",
  "page_type": "text",
  "is_archived": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T12:30:00Z"
}
```

---

### DELETE /pages/:id

Удаление страницы.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (204 No Content):**

---

### POST /pages/:id/update

Обновление содержимого страницы (Yjs binary).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "content": "base64_encoded_yjs_binary_data..."
}
```

**Response (200 OK):**

---

## Файлы (Assets)

### POST /assets/upload-url

Получение presigned URL для загрузки файла.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "filename": "image.png",
  "mime_type": "image/png",
  "page_id": "550e8400-e29b-41d4-a716-446655440010",
  "workspace_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200 OK):**
```json
{
  "upload_url": "http://localhost:9000/blocknote/...",
  "download_url": "http://localhost:9000/blocknote/...",
  "key": "workspace_id/page_id/asset_id",
  "expires_in": 3600,
  "asset_id": "550e8400-e29b-41d4-a716-446655440020"
}
```

**Следующий шаг:**
```bash
curl -X PUT -T image.png "http://localhost:9000/blocknote/..."
```

---

### GET /assets/:id/download-url

Получение presigned URL для скачивания файла.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "download_url": "http://localhost:9000/blocknote/...",
  "expires_in": 3600
}
```

**Response (404 Not Found):**
```
Asset not found
```

---

## WebSocket

### WS /api/ws/pages/:id

Real-time синхронизация страницы через Yjs.

**Подключение:**
```
ws://localhost:8080/api/ws/pages/550e8400-e29b-41d4-a716-446655440010
```

**Протокол:**
- Binary сообщения (Yjs updates)
- Двусторонняя связь
- Автоматическая ретрансляция между клиентами

**Пример использования с Yjs:**
```javascript
import * as Y from 'yjs';

const doc = new Y.Doc();
const ws = new WebSocket('ws://localhost:8080/api/ws/pages/:id');

ws.onopen = () => {
  // Отправить текущее состояние
  const update = Y.encodeStateAsUpdate(doc);
  ws.send(update);
};

ws.onmessage = (event) => {
  // Получить обновление от других клиентов
  const update = new Uint8Array(event.data);
  Y.applyUpdate(doc, update);
};

// При локальных изменениях
doc.on('update', (update) => {
  ws.send(update);
});
```

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | Успешный запрос |
| 201 | Ресурс создан |
| 204 | Успешное удаление (без тела ответа) |
| 400 | Неверный запрос (невалидное тело) |
| 401 | Неавторизованный запрос |
| 403 | Доступ запрещён |
| 404 | Ресурс не найден |
| 409 | Конфликт (ресурс уже существует) |
| 405 | Метод не разрешён |
| 500 | Внутренняя ошибка сервера |

---

## Аутентификация

Все endpoints (кроме `/auth/register` и `/auth/login`) требуют JWT токен в заголовке:

```
Authorization: Bearer <token>
```

Токен получается при регистрации или входе и должен храниться на клиенте (localStorage/cookie).

---

## Лимиты и ограничения

| Параметр | Значение |
|----------|----------|
| Максимальный размер файла | 10 MB |
| Время жизни presigned URL | 1 час |
| Максимальное количество участников | 100 |
| Максимальная глубина вложенности страниц | 10 |

---

## Примеры использования

### 1. Регистрация и создание страницы

```bash
# Регистрация
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password","name":"User"}'

# Сохраняем токен из ответа
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Создание workspace
curl -X POST http://localhost:8080/api/workspaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"My Workspace"}'

# Создание страницы
curl -X POST http://localhost:8080/api/pages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"workspace_id":"...","page_type":"text","title":"My Page"}'
```

### 2. Получение страниц workspace

```bash
curl -X GET http://localhost:8080/api/workspaces/:id/pages \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Обновление содержимого страницы

```bash
# Кодируем Yjs binary в base64
CONTENT=$(echo -n "binary_data" | base64)

curl -X POST http://localhost:8080/api/pages/:id/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"content\":\"$CONTENT\"}"
```
