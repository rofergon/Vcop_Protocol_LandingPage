# VCOP Protocol - MockETH Faucet

## 🚰 Faucet para MockETH en Avalanche Fuji

### Descripción
Hemos integrado un faucet de MockETH en la aplicación VCOP Protocol para facilitar las pruebas del protocolo de préstamos en Avalanche Fuji testnet.

### Funcionalidad

#### 🔗 Integración en la App
El faucet está integrado directamente en la aplicación principal y se activa automáticamente cuando:

#### 📋 Proceso de Uso
1. **Conectar Wallet**: El usuario debe conectar su wallet a Avalanche Fuji
2. **Acceder al Faucet**: Se muestra automáticamente cuando se detecta saldo insuficiente de MockETH
3. **Solicitar Tokens**: Click en "Get Free MockETH" para recibir 10 MockETH
4. **Confirmación**: La transacción se procesa y se actualiza el balance automáticamente

#### 🔧 Detalles Técnicos
- **Cantidad por solicitud**: 10 MockETH
- **Cooldown**: Sin límites de tiempo (para facilitar testing)
- **Gas Fee**: Pagado en AVAX (Avalanche Fuji testnet)
- **Contrato MockETH**: Dirección actualizada en deployed-addresses-mock.json

#### 📊 Características
- **Red**: Avalanche Fuji (Chain ID: 43113)
- **Explorador**: SnowTrace Testnet
- **Actualizaciones automáticas**: El balance se refresca después de cada transacción
- **Estados visuales**: Loading, success, error con feedback visual
- **Enlaces directos**: Links a SnowTrace para verificar transacciones

#### 🎯 Ventajas del Faucet Integrado
- ✅ **Experiencia fluida**: No necesidad de ir a faucets externos
- ✅ **Detección automática**: Se activa cuando es necesario
- ✅ **Feedback en tiempo real**: Estados de loading y confirmación
- ✅ **Integración perfecta**: Funciona junto con el resto de la aplicación

### Estados del Faucet
- 🔌 **Sin conectar**: "Connect wallet"
- ⏳ **Cargando**: "Minting..." / "Confirming..."
- ✅ **Éxito**: "Minted 1 ETH!" + link a BaseScan
- ❌ **Error**: Mensaje de error específico
- 🔄 **Reset**: Opción para reintentar después de error o éxito

### Información Técnica

#### Contrato MockETH
- **Dirección**: `0xDe3fd80E2bcCc96f5FB43ac7481036Db9998f521`
- **Red**: Avalanche Fuji (Chain ID: 43113)
- **Función**: `mint(address to, uint256 amount)`
- **Cantidad**: 1 ETH (1 × 10^18 wei)

#### Archivos Implementados
1. **`src/app/components/MockETHFaucet.tsx`** - Componente principal del faucet
2. **`src/hooks/useMockETHFaucet.ts`** - Hook personalizado para manejar lógica del faucet
3. **Integración en**:
   - `src/app/index.tsx` - CreatePositionTab principal
   - `src/app/components/RealPositionCreator.tsx` - Componente de posiciones reales

#### Stack Tecnológico
- **wagmi v2**: Hooks para interacción con contratos
- **viem v2**: Utilidades para formateo y parsing
- **React**: Hooks useState, useEffect, useCallback
- **TypeScript**: Tipado completo del estado y funciones

### Uso del Hook `useMockETHFaucet`

```typescript
import { useMockETHFaucet } from '../hooks/useMockETHFaucet';

const MyComponent = () => {
  const {
    isLoading,
    error,
    success,
    txHash,
    requestETH,
    resetFaucet,
    balance,
    canRequest,
    hasError,
    hasSuccess
  } = useMockETHFaucet();

  return (
    <button onClick={requestETH} disabled={!canRequest}>
      {isLoading ? 'Minting...' : 'Get 1 ETH'}
    </button>
  );
};
```

### Beneficios para Usuarios
1. **Facilita pruebas**: Los usuarios pueden obtener ETH fácilmente para probar el protocolo
2. **Sin salir de la app**: No necesitan ir a faucets externos
3. **Feedback inmediato**: Estados claros y enlaces para verificar transacciones
4. **Balance visible**: Pueden ver su balance actual de MockETH

### Próximos Pasos
- ✅ Faucet básico implementado
- 🔄 Posible rate limiting en el futuro
- 🔄 Integración con otros tokens mock (USDC, WBTC)
- 🔄 Histórico de transacciones del faucet

---

**Desarrollado para VCOP Protocol** - El primer protocolo DeFi de préstamos para América Latina 🌎 