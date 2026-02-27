# AI Agent Debug Guide

## Запуск проекта

### Frontend
```bash
cd frontend
npm run dev          # Запуск dev сервера на порту 3000
npm run dev:debug    # Запуск с отладочным логированием
npm run dev:inspect # Запуск с inspector
npm run build       # Production сборка
npm run preview     # Preview production сборки
```

### Backend
```bash
cd backend
go run cmd/api/main.go  # Запуск API сервера на порту 8080
```

## Отладка в браузере

### React Developer Tools
1. Установить React Developer Tools расширение для Chrome/Firefox
2. Открыть DevTools (F12) -> вкладка "Components" или "Profiler"

### Vite Dev Tools
1. Открыть DevTools (F12)
2. Вкладка "Vite" для просмотра модулей и зависимостей

### Debug URL параметры
- `?debug=1` - включить дополнительное логирование
- `?mock=1` - использовать моковые данные

## Console Debugging

### Полезные команды в консоли
```javascript
// Найти компонент
$$('ComponentName') 

// Найти все экземпляры компонента
$$$('ComponentName')

// Просмотр состояния
$r - текущий выбранный компонент в React DevTools

// Очистка localStorage
localStorage.clear()

// Очистка sessionStorage  
sessionStorage.clear()
```

## Тестирование

### Unit тесты
```bash
npm run test           # Запуск тестов
npm run test:watch    # Watch mode
npm run test:ui       # UI интерфейс для тестов
npm run test:coverage # Покрытие кода
```

### E2E тесты (Playwright)
```bash
npm run test:e2e           # Запуск e2e тестов
npm run test:e2e:ui       # UI режим
npx playwright show-report # Показать отчет
```

### Структура e2e тестов
- `e2e/app.spec.ts` - основные UI тесты
- Используйте `test.describe` для группировки
- Используйте `test.beforeEach` для подготовки

## Pre-commit проверки

Хуки запускаются автоматически перед коммитом:
1. TypeScript type checking (`tsc --noEmit`)
2. ESLint проверка

### Ручной запуск
```bash
npx tsc --noEmit              # TypeScript проверка
npx eslint . --ext ts,tsx    # ESLint проверка
```

## Network Debugging

### API запросы
1. DevTools -> Network tab
2. Фильтр "Fetch/XHR"
3. Смотреть запросы к `/api/*`

### WebSocket отладка
1. DevTools -> Network -> WS
2. Фильтр по `ws://localhost`

## State Debugging

### Redux DevTools (если используется)
- Установить Redux DevTools расширение
- Смотреть actions и state

### React Context
- Использовать React DevTools
- Смотреть Context providers

## Типичные проблемы

### "Module not found"
```bash
# Очистить кэш и переустановить
rm -rf node_modules/.vite
npm install
```

### "Circular dependency"
```bash
# Запустить с предупреждениями
npm run build 2>&1 | grep -i circular
```

### HMR не работает
```bash
# Перезапустить dev сервер
Ctrl+C
npm run dev
```

## Production Debug

### Логи
```bash
# Просмотр логов backend
docker logs <container_id>

# Просмотр логов frontend (nginx)
docker logs <nginx_container>
```

### Source maps
- DevTools -> Settings -> Enable source maps
- Позволяет видеть оригинальный код в production

## Конфигурация

### Vite config (vite.config.ts)
- `server.port` - порт dev сервера
- `server.proxy` - проксирование API
- `build.outDir` - директория сборки

### TypeScript (tsconfig.json)
- `noEmit` - только проверка без вывода
- `strict` - строгий режим проверки

### ESLint (.eslintrc)
- Правила линтинга
- extends: react-hooks, react-refresh
