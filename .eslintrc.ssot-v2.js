// .eslintrc.ssot-v2.js
// ESLint Rules para SSOT V2 - Bloquea patrones legacy

module.exports = {
  extends: ['./.eslintrc.js'],
  rules: {
    // Bloquear imports legacy
    'no-restricted-imports': ['error', {
      paths: [
        { 
          name: '@/lib/warehouse-generators', 
          message: 'Use @/services/canonical (SkuService/LotService)' 
        },
        { 
          name: './warehouse-generators', 
          message: 'Use @/services/canonical (SkuService/LotService)' 
        },
        { 
          name: '../warehouse-generators', 
          message: 'Use @/services/canonical (SkuService/LotService)' 
        }
      ]
    }],
    
    // Bloquear sintaxis legacy
    'no-restricted-syntax': [
      'error',
      
      // Campos deprecated
      { 
        selector: "Identifier[name='lotNumber']", 
        message: 'Use lotCode instead of lotNumber' 
      },
      { 
        selector: "Identifier[name='warehouseId']", 
        message: 'Use fromLocationId/toLocationId instead of warehouseId' 
      },
      { 
        selector: "Identifier[name='toWarehouseId']", 
        message: 'Use toLocationId instead of toWarehouseId' 
      },
      { 
        selector: "Literal[value='lotNumber']", 
        message: 'Use "lotCode" in Firestore queries' 
      },
      { 
        selector: "Literal[value='warehouseId']", 
        message: 'Use "fromLocationId" or "toLocationId" in Firestore queries' 
      },
      
      // Funciones legacy
      { 
        selector: "Identifier[name='generateSKU']", 
        message: 'Use SkuService.makeSku() instead of generateSKU()' 
      },
      { 
        selector: "Identifier[name='generateInternalLot']", 
        message: 'Use LotService.generateLotCode() instead of generateInternalLot()' 
      },
      { 
        selector: "Identifier[name='lotPrefixFromSku']", 
        message: 'Use LotService.generateLotCode() instead of lotPrefixFromSku()' 
      },
      { 
        selector: "Identifier[name='findNextLotNumber']", 
        message: 'Use LotService.generateLotCode() instead of findNextLotNumber()' 
      },
      
      // Patrones problemáticos en StockMove
      { 
        selector: "MemberExpression[object.name='stockMove'][property.name='date']", 
        message: 'Use stockMove.occurredAt instead of stockMove.date' 
      },
      { 
        selector: "MemberExpression[object.name='sm'][property.name='date']", 
        message: 'Use sm.occurredAt instead of sm.date' 
      }
    ]
  }
};
