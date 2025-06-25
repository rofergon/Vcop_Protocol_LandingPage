# MockETH Faucet - VCOP Protocol

## 🚰 Faucet para MockETH en Base Sepolia

### Descripción
Hemos integrado un faucet de MockETH en la aplicación VCOP Protocol para facilitar las pruebas del protocolo de préstamos en Base Sepolia testnet.

### Características
- **Cantidad fija**: Mintea exactamente 1 ETH por transacción
- **Ubicación**: Esquina superior derecha de los componentes CreatePosition
- **Integración completa**: Manejo de estados, errores y confirmaciones
- **Balance en tiempo real**: Muestra el balance actual de MockETH del usuario
- **Enlaces a explorer**: Links directos a BaseScan para verificar transacciones

### Funcionamiento
1. **Conectar Wallet**: El usuario debe conectar su wallet a Base Sepolia
2. **Hacer clic en "Get 1 ETH"**: Ejecuta la función mint del contrato MockETH
3. **Confirmar transacción**: Aprobar la transacción en la wallet
4. **Esperar confirmación**: El faucet mostrará el estado de la transacción
5. **Balance actualizado**: El balance se actualiza automáticamente después del mint

### Estados del Faucet
- 🔌 **Sin conectar**: "Connect wallet"
- ⏳ **Cargando**: "Minting..." / "Confirming..."
- ✅ **Éxito**: "Minted 1 ETH!" + link a BaseScan
- ❌ **Error**: Mensaje de error específico
- 🔄 **Reset**: Opción para reintentar después de error o éxito

### Información Técnica

#### Contrato MockETH
- **Dirección**: `0xDe3fd80E2bcCc96f5FB43ac7481036Db9998f521`
- **Red**: Base Sepolia (Chain ID: 84532)
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