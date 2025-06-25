# VCOP Loan Application

Esta es la aplicación de préstamos de VCOP Protocol que permite a los usuarios crear y administrar posiciones de préstamo flexibles sin límites de LTV tradicionales.

## 🏗️ Estructura del Proyecto

```
src/app/
├── components/           # Componentes reutilizables
│   ├── AssetDropdown.tsx    # Selector de activos con iconos
│   ├── PositionSummary.tsx  # Análisis de riesgo en tiempo real
│   └── TransactionStatus.tsx # Estado de transacciones
├── hooks/               # Hooks personalizados
│   └── useCreatePosition.ts # Hook para crear posiciones (mock)
├── pages/               # Páginas de la aplicación
│   └── CreatePosition.tsx   # Página de creación de posiciones
├── index.tsx           # Aplicación principal con navegación
└── README.md           # Este archivo
```

## 🚀 Características Principales

### 1. **Flexibilidad Extrema**
- **ANY ratio allowed** - Sin límites de LTV tradicionales
- Soporte para ratios superiores al 100%
- Integración con contratos `FlexibleLoanManager.sol` y `VaultBasedHandler.sol`

### 2. **Dos Modos de Usuario**

#### **Easy Mode** 🟢
- Interfaz simplificada para usuarios nuevos
- Presets de riesgo predefinidos (Conservative, Moderate, Aggressive, Extreme)
- Slider visual para LTV
- Cálculo automático de cantidades de préstamo

#### **Expert Mode** 🎓
- Control granular de todos los parámetros
- Configuración manual de cantidades exactas
- Acceso a métricas avanzadas de riesgo
- Análisis detallado de liquidación

### 3. **Análisis de Riesgo en Tiempo Real**
- Health Factor dinámico
- Ratio de colateralización
- Predicción de precios de liquidación
- Escenarios de impacto de precios
- Alertas de riesgo visuales

### 4. **Soporte Multi-Asset**

#### **Activos de Colateral**
- ETH (Ethereum)
- WBTC (Wrapped Bitcoin) 
- USDC (USD Coin)

#### **Activos de Préstamo**
- USDC (USD Coin)
- VCOP (VCOP Peso)
- ETH (Ethereum)

### 5. **Componentes de UI Avanzados**

#### **AssetDropdown**
- Selector visual de activos con iconos
- Información de decimales
- Estado de selección visual
- Click fuera para cerrar

#### **PositionSummary**
- Métricas clave de riesgo
- Análisis de liquidación
- Límites de posición
- Escenarios de precio

#### **TransactionStatus**
- Estados de carga con spinner
- Seguimiento de hash de transacción
- Links a exploradores de blockchain
- Soluciones para errores comunes
- Progreso visual de pasos

## 🎨 Diseño Visual

### **Colores y Temas**
- **Emerald/Teal** - Branding principal de VCOP
- **Blue** - Información y navegación
- **Purple/Pink** - Análisis y métricas
- **Gradientes** - Headers y elementos destacados

### **Estados de Riesgo**
- 🟢 **Ultra Safe / Healthy** - Verde
- 🔵 **Moderate** - Azul
- 🟡 **Aggressive** - Amarillo
- 🟠 **Extreme** - Naranja  
- 🔴 **Danger Zone** - Rojo

## 🔧 Integración con Contratos

### **FlexibleLoanManager.sol**
- Creación de posiciones sin límites de ratio
- Gestión de colateral y préstamos
- Sistema de liquidación flexible
- Coordinación con registro de emergencias

### **VaultBasedHandler.sol**
- Manejo de activos basados en vault (ETH, WBTC)
- Provisión de liquidez
- Liquidaciones automatizadas
- Sistema de recompensas

## 📱 Navegación de la App

### **Home** 🏠
- Landing page con estadísticas del protocolo
- Características principales
- Call-to-action para empezar

### **Create Position** ⚡
- Interfaz principal para crear posiciones
- Modos Easy y Expert
- Análisis de riesgo en tiempo real
- Estimación de gas

### **Dashboard** 📊
- Gestión de posiciones activas (próximamente)
- Monitoreo de salud de posiciones
- Alertas de liquidación
- Historial de transacciones

## 🧪 Estado Actual

### **Completado** ✅
- [x] Estructura base de la aplicación
- [x] Navegación principal
- [x] Componentes de UI reutilizables
- [x] Diseño responsivo
- [x] Modo Easy con presets
- [x] Modo Expert con control granular
- [x] Análisis de riesgo visual
- [x] Estados de transacción

### **En Desarrollo** 🚧
- [ ] Integración real con contratos (actualmente mock)
- [ ] Conexión de wallet
- [ ] Dashboard de posiciones
- [ ] Gestión de posiciones existentes
- [ ] Notificaciones y alertas

### **Próximas Características** 🔮
- [ ] Soporte para más activos
- [ ] Análisis histórico de precios
- [ ] Estrategias de trading automatizadas
- [ ] Integración con AMMs para liquidación
- [ ] Sistema de recompensas/governance

## 🎯 Ventaja Competitiva de VCOP

### **Flexibilidad Sin Precedentes**
- Ratios superiores al 100% LTV
- No hay límites artificiales del protocolo
- Liquidación basada en métricas reales, no ratios fijos

### **Risk Management Avanzado**
- Análisis en tiempo real de múltiples escenarios
- Predicción de liquidación basada en volatilidad
- Sistema de alertas proactivo

### **UX/UI Superior**
- Dos modos para diferentes tipos de usuarios
- Visualización clara de riesgos complejos
- Feedback inmediato en cada cambio

## 🚀 Cómo Usar

1. **Conectar Wallet** - Conecta tu wallet compatible
2. **Seleccionar Modo** - Elige Easy para simplicidad o Expert para control total
3. **Configurar Posición** - Selecciona activos y cantidades
4. **Revisar Riesgos** - Analiza las métricas de riesgo en tiempo real
5. **Crear Posición** - Confirma la transacción en tu wallet
6. **Monitorear** - Usa el dashboard para gestionar tu posición

---

**⚠️ Disclaimer**: Esta aplicación permite ratios extremos de apalancamiento. Siempre evalúa tu tolerancia al riesgo antes de crear posiciones. 