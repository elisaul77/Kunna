# Contribuir a kuNNA 🤝

¡Gracias por tu interés en contribuir a kuNNA! Este documento proporciona guías para contribuir al proyecto.

## 🌟 Código de Conducta

Este proyecto se adhiere a un código de conducta. Al participar, se espera que mantengas un ambiente respetuoso y profesional.

## 🚀 Formas de Contribuir

### 1. Reportar Bugs 🐛
- Usa el [sistema de issues](https://github.com/elisaul77/Kunna/issues)
- Incluye información detallada:
  - Versión de kuNNA
  - Sistema operativo
  - Pasos para reproducir
  - Comportamiento esperado vs actual
  - Logs relevantes

### 2. Sugerir Mejoras 💡
- Abre un issue con la etiqueta `enhancement`
- Describe claramente:
  - El problema que resuelve
  - La solución propuesta
  - Alternativas consideradas

### 3. Contribuir Código 💻

#### Proceso de Pull Request
1. **Fork** el repositorio
2. **Crea una rama** desde `main`:
   ```bash
   git checkout -b feature/mi-nueva-funcionalidad
   ```
3. **Realiza tus cambios** siguiendo las guías de estilo
4. **Commits semánticos**:
   ```
   feat: Agregar soporte para multi-cloud
   fix: Corregir detección de contenedores detenidos
   docs: Actualizar guía de despliegue SSH
   chore: Limpiar código sin cambios funcionales
   ```
5. **Prueba tus cambios** localmente
6. **Push** a tu fork:
   ```bash
   git push origin feature/mi-nueva-funcionalidad
   ```
7. **Abre un Pull Request** contra `main`

#### Guías de Estilo

**Python**:
- Sigue PEP 8
- Usa type hints cuando sea posible
- Documenta funciones con docstrings
- Máximo 100 caracteres por línea

**JavaScript**:
- Usa const/let (no var)
- Nombres descriptivos para variables
- Comentarios para lógica compleja

**Commits**:
- Mensajes en español o inglés (consistentes)
- Primera línea: resumen (máx 50 caracteres)
- Cuerpo opcional: explicación detallada

### 4. Mejorar Documentación 📚
- Corrige typos
- Mejora claridad de explicaciones
- Agrega ejemplos prácticos
- Traduce documentación

### 5. Compartir Casos de Uso 🌐
- Escribe artículos/tutoriales
- Graba videos demostrativos
- Presenta kuNNA en meetups
- Comparte en redes sociales

## 🧪 Testing

Antes de enviar un PR:
```bash
# Verifica sintaxis Python
python3 -m py_compile backend/app.py agent/agent.py

# Prueba el despliegue local
docker-compose up --build

# Verifica que los servicios funcionan
curl http://localhost:8000/api/health
```

## 📝 Checklist para PRs

- [ ] El código compila sin errores
- [ ] Los cambios son probados localmente
- [ ] La documentación está actualizada
- [ ] Los commits siguen el formato semántico
- [ ] No hay datos sensibles (IPs, tokens, passwords)
- [ ] El PR tiene una descripción clara

## 💬 Comunicación

- **Issues**: Para bugs y features
- **Discussions**: Para preguntas generales
- **Pull Requests**: Para contribuciones de código

## 🎯 Áreas Prioritarias

Buscamos ayuda especialmente en:
- [ ] Soporte para Kubernetes
- [ ] Integración con Prometheus/Grafana
- [ ] Cliente CLI para gestión remota
- [ ] Tests automatizados
- [ ] Internacionalización (i18n)
- [ ] Documentación en otros idiomas

## 🏆 Reconocimiento

Todos los contribuidores serán reconocidos en:
- README.md (sección Contributors)
- Releases notes
- Página web del proyecto (próximamente)

---

## 💖 Apoya el Proyecto

Si kuNNA te resulta útil pero no puedes contribuir con código:

- ⭐ Dale una estrella al repositorio
- 📢 Compártelo con otros desarrolladores
- 💰 [Considera una donación](FUNDING.md)
- 📝 Escribe sobre tu experiencia
- 🐛 Reporta bugs que encuentres

¡Gracias por hacer de kuNNA un mejor proyecto! 🚀
