# Схема базы данных BlockNote

## Обзор

База данных BlockNote построена на **PostgreSQL 16** и использует следующие основные сущности:

- **Users** — пользователи системы
- **Workspaces** — рабочие пространства (мульти-тенантность)
- **Workspace Members** — участники рабочих пространств
- **Pages** — страницы/документы
- **Page Contents** — содержимое страниц (Yjs binary)
- **Assets** — метаданные файлов

---

## ER-диаграмма

```
┌─────────────────┐       ┌─────────────────────┐
│     users       │       │    workspaces       │
├─────────────────┤       ├─────────────────────┤
│ id (PK)         │       │ id (PK)             │
│ email           │       │ name                │
│ password_hash   │       │ owner_id (FK→users) │
│ name            │       │ created_at          │
│ avatar_url      │       │ updated_at          │
│ created_at      │       └──────────┬──────────┘
│ updated_at      │                  │
└─────────────────┘                  │
                                     │ 1
         ┌───────────────────────────┼────────────────────────────┐
         │                           │                            │
         │ ┌─────────────────────────▼────────────────────────┐   │
         │ │            workspace_members                      │   │
         │ ├───────────────────────────────────────────────────┤   │
         │ │ workspace_id (FK), user_id (FK) [COMPOSITE PK]   │   │
         │ │ role                                             │   │
         │ │ created_at                                       │   │
         │ └───────────────────────────────────────────────────┘   │
         │                                                         │
         │ 1                                                       │
         ▼                                                         │
┌─────────────────┐                                               │
│      pages      │                                               │
├─────────────────┤                                               │
│ id (PK)         │◄──────────────────────────────────────────────┘
│ workspace_id (FK)───┐
│ parent_id (FK)  │   │
│ owner_id (FK)   │   │
│ title           │   │
│ icon            │   │
│ page_type       │   │
│ is_archived     │   │
│ created_at      │   │
│ updated_at      │   │
└────────┬────────┘   │
         │            │
         │ 1          │
         ▼            │
┌─────────────────┐  │
│ page_contents   │  │
├─────────────────┤  │
│ page_id (PK,FK) │──┘
│ content (BYTEA) │
│ version         │
│ updated_at      │
└─────────────────┘

┌─────────────────┐
│     assets      │
├─────────────────┤
│ id (PK)         │
│ workspace_id (FK)───► workspaces.id
│ page_id (FK)    │───► pages.id
│ user_id (FK)    │───► users.id
│ filename        │
│ s3_key          │
│ mime_type       │
│ size            │
│ created_at      │
└─────────────────┘
```

---

## Таблицы

### users

Пользователи системы.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

**Поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | Уникальный идентификатор |
| `email` | VARCHAR(255) | Email (уникальный) |
| `password_hash` | VARCHAR(255) | Хеш пароля (bcrypt) |
| `name` | VARCHAR(255) | Отображаемое имя |
| `avatar_url` | VARCHAR(500) | URL аватара |
| `created_at` | TIMESTAMP | Дата создания |
| `updated_at` | TIMESTAMP | Дата обновления |

---

### workspaces

Рабочие пространства для организации страниц.

```sql
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | Уникальный идентификатор |
| `name` | VARCHAR(255) | Название workspace |
| `owner_id` | UUID | Владелец (ссылка на users) |
| `created_at` | TIMESTAMP | Дата создания |
| `updated_at` | TIMESTAMP | Дата обновления |

---

### workspace_members

Участники рабочих пространств с ролями.

```sql
CREATE TABLE workspace_members (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
```

**Поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| `workspace_id` | UUID | Ссылка на workspaces |
| `user_id` | UUID | Ссылка на users |
| `role` | VARCHAR(50) | Роль участника |
| `created_at` | TIMESTAMP | Дата добавления |

**Возможные роли:**
- `owner` — владелец (автоматически при создании)
- `admin` — администратор
- `editor` — редактор
- `viewer` — наблюдатель

---

### pages

Страницы документов с поддержкой иерархии.

```sql
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) DEFAULT 'Untitled',
    icon VARCHAR(10),
    page_type VARCHAR(20) DEFAULT 'text' NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pages_workspace ON pages(workspace_id);
CREATE INDEX idx_pages_parent ON pages(parent_id);
CREATE INDEX idx_pages_owner ON pages(owner_id);
CREATE INDEX idx_pages_type ON pages(page_type);
```

**Поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | Уникальный идентификатор |
| `workspace_id` | UUID | Ссылка на workspaces |
| `parent_id` | UUID | Родительская страница (для иерархии) |
| `owner_id` | UUID | Владелец страницы |
| `title` | VARCHAR(500) | Заголовок |
| `icon` | VARCHAR(10) | Иконка (emoji) |
| `page_type` | VARCHAR(20) | Тип страницы |
| `is_archived` | BOOLEAN | Флаг архивации |
| `created_at` | TIMESTAMP | Дата создания |
| `updated_at` | TIMESTAMP | Дата обновления |

**Возможные значения `page_type`:**
- `text` — текстовый документ (Notion-like)
- `board` — доска (FigJam-like)

---

### page_contents

Содержимое страниц в формате Yjs binary.

```sql
CREATE TABLE page_contents (
    page_id UUID PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
    content BYTEA NOT NULL DEFAULT '',
    version INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| `page_id` | UUID | Ссылка на pages (PK) |
| `content` | BYTEA | Yjs binary данные |
| `version` | INTEGER | Версия для оптимистичной блокировки |
| `updated_at` | TIMESTAMP | Дата обновления |

---

### assets

Метаданные файлов, хранящихся в S3.

```sql
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_assets_page ON assets(page_id);
CREATE INDEX idx_assets_workspace ON assets(workspace_id);
CREATE INDEX idx_assets_user ON assets(user_id);
```

**Поля:**
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | Уникальный идентификатор |
| `workspace_id` | UUID | Ссылка на workspaces |
| `page_id` | UUID | Ссылка на pages |
| `user_id` | UUID | Загрузивший пользователь |
| `filename` | VARCHAR(255) | Оригинальное имя файла |
| `s3_key` | VARCHAR(500) | Ключ в S3 хранилище |
| `mime_type` | VARCHAR(100) | MIME тип файла |
| `size` | INTEGER | Размер в байтах |
| `created_at` | TIMESTAMP | Дата загрузки |

---

## Триггеры

### Автоматическое обновление `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at 
    BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at 
    BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_contents_updated_at 
    BEFORE UPDATE ON page_contents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Связи между таблицами

### Один ко многим

| От | К | Описание |
|----|---|----------|
| users → workspaces | 1:N | Пользователь может владеть несколькими workspace |
| users → pages | 1:N | Пользователь может создавать страницы |
| workspace → pages | 1:N | Workspace содержит страницы |
| pages → pages | 1:N | Страницы могут иметь дочерние страницы |
| pages → page_contents | 1:1 | Каждая страница имеет одно содержимое |
| workspace → assets | 1:N | Workspace содержит файлы |
| page → assets | 1:N | Страница может содержать файлы |

### Многие ко многим

| Таблица | Сущности | Описание |
|---------|----------|----------|
| workspace_members | users ↔ workspaces | Участники workspace |

---

## Каскадное удаление

| Таблица | При удалении |
|---------|--------------|
| users | → workspaces (CASCADE), workspace_members (CASCADE) |
| workspaces | → pages (CASCADE), workspace_members (CASCADE), assets (CASCADE) |
| pages | → pages (дочерние, CASCADE), page_contents (CASCADE), assets (CASCADE) |
| users (в workspace_members) | → workspace_members (CASCADE) |

---

## Примеры запросов

### Получить все страницы workspace с иерархией

```sql
WITH RECURSIVE page_tree AS (
    -- Корневые страницы
    SELECT id, workspace_id, parent_id, title, icon, page_type, 0 as depth
    FROM pages
    WHERE workspace_id = '...' AND parent_id IS NULL
    
    UNION ALL
    
    -- Дочерние страницы
    SELECT p.id, p.workspace_id, p.parent_id, p.title, p.icon, p.page_type, pt.depth + 1
    FROM pages p
    INNER JOIN page_tree pt ON p.parent_id = pt.id
    WHERE p.workspace_id = '...'
)
SELECT * FROM page_tree ORDER BY depth, title;
```

### Получить workspace с участниками

```sql
SELECT 
    w.*,
    json_agg(json_build_object(
        'user_id', wm.user_id,
        'role', wm.role,
        'user', json_build_object(
            'id', u.id,
            'name', u.name,
            'email', u.email
        )
    )) as members
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
LEFT JOIN users u ON wm.user_id = u.id
WHERE w.id = '...'
GROUP BY w.id;
```

### Получить статистику пользователя

```sql
SELECT 
    u.id,
    u.name,
    COUNT(DISTINCT w.id) as workspaces_count,
    COUNT(DISTINCT p.id) as pages_count,
    SUM(a.size) as total_storage_bytes
FROM users u
LEFT JOIN workspaces w ON u.id = w.owner_id
LEFT JOIN pages p ON u.id = p.owner_id
LEFT JOIN assets a ON u.id = a.user_id
WHERE u.id = '...'
GROUP BY u.id;
```

### Получить последние изменённые страницы

```sql
SELECT 
    p.id,
    p.title,
    p.icon,
    p.page_type,
    p.updated_at,
    w.name as workspace_name,
    u.name as owner_name
FROM pages p
JOIN workspaces w ON p.workspace_id = w.id
JOIN users u ON p.owner_id = u.id
WHERE p.workspace_id = '...'
  AND p.is_archived = FALSE
ORDER BY p.updated_at DESC
LIMIT 10;
```

---

## Индексы

### Существующие индексы

| Таблица | Индекс | Поля |
|---------|--------|------|
| users | idx_users_email | email |
| workspace_members | idx_workspace_members_user | user_id |
| pages | idx_pages_workspace | workspace_id |
| pages | idx_pages_parent | parent_id |
| pages | idx_pages_owner | owner_id |
| pages | idx_pages_type | page_type |
| assets | idx_assets_page | page_id |
| assets | idx_assets_workspace | workspace_id |
| assets | idx_assets_user | user_id |

### Рекомендации по дополнительным индексам

Для улучшения производительности можно добавить:

```sql
-- Для быстрого поиска по архивным страницам
CREATE INDEX idx_pages_archived ON pages(is_archived) WHERE is_archived = true;

-- Для сортировки по дате обновления
CREATE INDEX idx_pages_updated_at ON pages(updated_at DESC);

-- Композитный индекс для частых запросов
CREATE INDEX idx_pages_workspace_archived ON pages(workspace_id, is_archived);
```

---

## Миграции

### Создание схемы с нуля

```bash
psql -U blocknote -d blocknote -f backend/schema.sql
```

### Применение миграций в production

Используйте инструменты миграции:
- **golang-migrate** для Go
- **Flyway** для Java
- **Alembic** для Python

Пример с golang-migrate:
```bash
migrate -path ./migrations -database "postgres://..." up
```

---

## Бэкап и восстановление

### Бэкап

```bash
pg_dump -U blocknote blocknote > backup.sql
```

### Восстановление

```bash
psql -U blocknote blocknote < backup.sql
```

### Point-in-time recovery

Настройте WAL архивирование в postgresql.conf:
```conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backup/%f'
```

---

## Производительность

### Рекомендации

1. **Connection pooling** — используйте PgBouncer для пулинга соединений
2. **VACUUM** — регулярный VACUUM ANALYZE для поддержания производительности
3. **Partitioning** — для больших таблиц (assets) рассмотрите партиционирование по дате
4. **Read replicas** — для масштабирования чтения

### Мониторинг

```sql
-- Размер таблиц
SELECT 
    relname as table_name,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Активные запросы
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Индексы, которые не используются
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
```
