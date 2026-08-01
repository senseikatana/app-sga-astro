# Git Flow - SGA Vilaseca

## 🌿 Estructura de Ramas

```
main (producción)
  ↑
develop (desarrollo)
  ↑
feature/* (features temporales)
hotfix/* (fixes urgentes)
```

## 📋 Flujo de Trabajo

### 1. Desarrollo de Features

```bash
# Crear nueva feature desde develop
git checkout develop
git pull origin develop
git checkout -b feature/nombre-descriptivo

# Trabajar en la feature
git add .
git commit -m "feat(scope): descripción"

# Finalizar feature (merge local, sin PR)
git checkout develop
git merge feature/nombre-descriptivo
git push origin develop

# Eliminar rama local
git branch -d feature/nombre-descriptivo
```

### 2. Hotfixes Urgentes

```bash
# Crear hotfix desde main
git checkout main
git pull origin main
git checkout -b hotfix/descripcion-bug

# Arreglar el bug
git add .
git commit -m "fix(scope): descripción del fix"

# Merge a main Y develop
git checkout main
git merge hotfix/descripcion-bug
git push origin main

git checkout develop
git merge hotfix/descripcion-bug
git push origin develop

# Eliminar rama
git branch -d hotfix/descripcion-bug
```

### 3. Release a Producción

```bash
# Cuando develop está listo para producción
git checkout main
git merge develop
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main --tags
```

## 🔒 Protección de Ramas (Recomendado)

### En GitHub:
1. Ve a Settings → Branches
2. Protege `main`:
   - ✅ Require pull request reviews (opcional)
   - ✅ Require status checks to pass
   - ✅ Include administrators
3. Protege `develop` (opcional)

### Sin PRs obligatorios:
- Puedes hacer merge local y push directo
- Útil para proyectos personales o equipos pequeños
- Mantiene historial limpio

## 📝 Convenciones de Commits

Usa el modo `/commit` de Bob Shell o sigue este formato:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Formato, punto y coma, etc
- `refactor`: Refactorización de código
- `perf`: Mejoras de rendimiento
- `test`: Tests
- `build`: Sistema de build
- `ci`: CI/CD
- `chore`: Mantenimiento

## 🚀 Comandos Rápidos

```bash
# Ver estado de ramas
git branch -a

# Ver historial gráfico
git log --oneline --graph --all -10

# Cambiar de rama
git checkout develop

# Actualizar desde remoto
git pull origin develop

# Ver diferencias
git diff develop..main
```

## 💡 Tips

1. **Commits frecuentes**: Haz commits pequeños y descriptivos
2. **Pull antes de push**: Siempre actualiza antes de subir cambios
3. **Branches descriptivos**: Usa nombres claros (feature/user-auth, fix/login-bug)
4. **Limpia branches**: Elimina branches mergeados
5. **Tags para releases**: Usa semantic versioning (v1.0.0, v1.1.0, etc)

## 🔄 Estado Actual

- ✅ `main`: Rama de producción (protegida)
- ✅ `develop`: Rama de desarrollo activo
- 📝 `feature/*`: Crear según necesidad
- 🚨 `hotfix/*`: Solo para emergencias
