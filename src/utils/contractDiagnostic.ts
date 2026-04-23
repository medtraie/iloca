import { Contract } from '@/hooks/useContracts';
import { computeContractSummary, daysBetween } from './contractMath';

export interface ContractDiagnostic {
  contractId: string;
  contractNumber: string | number;
  customerName: string;
  issues: string[];
  currentValues: {
    storedDuration?: number;
    calculatedDuration: number;
    storedTotal?: number;
    calculatedTotal: number;
    storedAdvance?: number;
    calculatedAdvance: number;
    storedRemaining?: number;
    calculatedRemaining: number;
  };
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Diagnostic des incohérences dans les contrats
 * Détecte les différences entre les valeurs stockées et calculées
 */
export function diagnoseContract(contract: Contract): ContractDiagnostic {
  const issues: string[] = [];
  const summary = computeContractSummary(contract, { advanceMode: 'field' });
  
  // Diagnostic de la durée
  let storedDuration: number | undefined;
  if (contract.contract_data?.rentalDays) {
    storedDuration = parseInt(contract.contract_data.rentalDays.toString());
  }
  
  // Diagnostic des montants
  const storedTotal = contract.total_amount;
  const storedAdvance = contract.advance_payment;
  const storedRemaining = storedTotal && storedAdvance ? storedTotal - storedAdvance : undefined;
  
  // Détection des incohérences
  if (storedDuration && storedDuration !== summary.duration) {
    issues.push(`Durée incohérente: stockée ${storedDuration}j vs calculée ${summary.duration}j`);
  }
  
  if (storedTotal && Math.abs(storedTotal - summary.total) > 0.01) {
    issues.push(`Total incohérent: stocké ${storedTotal} DH vs calculé ${summary.total} DH`);
  }
  
  if (storedAdvance && Math.abs(storedAdvance - summary.avance) > 0.01) {
    issues.push(`Avance incohérente: stockée ${storedAdvance} DH vs calculée ${summary.avance} DH`);
  }
  
  if (storedRemaining && Math.abs(storedRemaining - summary.reste) > 0.01) {
    issues.push(`Reste incohérent: stocké ${storedRemaining} DH vs calculé ${summary.reste} DH`);
  }
  
  // Validation des dates
  if (!contract.start_date || !contract.end_date) {
    issues.push('Dates manquantes');
  } else {
    try {
      const calculatedDays = daysBetween(contract.start_date, contract.end_date, { inclusive: false });
      if (storedDuration && storedDuration !== calculatedDays) {
        issues.push(`Durée basée sur les dates: ${calculatedDays}j vs durée stockée: ${storedDuration}j`);
      }
    } catch (error) {
      issues.push('Erreur de calcul des dates');
    }
  }
  
  // Validation du prix journalier
  if (!contract.daily_rate || contract.daily_rate <= 0) {
    issues.push('Prix journalier manquant ou invalide');
  }
  
  // Déterminer la sévérité
  let severity: 'info' | 'warning' | 'critical' = 'info';
  if (issues.some(issue => issue.includes('manquant') || issue.includes('Erreur'))) {
    severity = 'critical';
  } else if (issues.length > 0) {
    severity = 'warning';
  }
  
  return {
    contractId: contract.id,
    contractNumber: contract.contract_number || contract.id,
    customerName: contract.customer_name || 'N/A',
    issues,
    currentValues: {
      storedDuration,
      calculatedDuration: summary.duration,
      storedTotal,
      calculatedTotal: summary.total,
      storedAdvance,
      calculatedAdvance: summary.avance,
      storedRemaining,
      calculatedRemaining: summary.reste
    },
    severity
  };
}

/**
 * Diagnostic de tous les contrats
 */
export function diagnoseAllContracts(contracts: Contract[]): ContractDiagnostic[] {
  return contracts.map(contract => diagnoseContract(contract));
}

/**
 * Console script pour diagnostiquer les contrats
 * À exécuter dans la console du navigateur
 */
export function generateDiagnosticScript(): string {
  return `
// 🔍 DIAGNOSTIC DES CONTRATS - Script de contrôle
// Collez ce script dans la console pour détecter les incohérences

(function() {
  console.log("🔍 === DIAGNOSTIC DES CONTRATS SFTLOCATION ===");
  
  const contracts = JSON.parse(localStorage.getItem('contracts') || '[]');
  console.log(\`📊 Total des contrats: \${contracts.length}\`);
  
  if (contracts.length === 0) {
    console.log("❌ Aucun contrat trouvé dans localStorage");
    return;
  }
  
  let totalIssues = 0;
  let criticalIssues = 0;
  
  contracts.forEach((contract, index) => {
    const issues = [];
    
    // Vérification des champs essentiels
    if (!contract.start_date) issues.push("❌ Date de début manquante");
    if (!contract.end_date) issues.push("❌ Date de fin manquante");
    if (!contract.daily_rate || contract.daily_rate <= 0) issues.push("❌ Prix journalier invalide");
    if (!contract.total_amount) issues.push("⚠️ Montant total manquant");
    
    // Calcul de la durée
    if (contract.start_date && contract.end_date) {
      const start = new Date(contract.start_date);
      const end = new Date(contract.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const storedDays = contract.contract_data?.rentalDays || 
                        contract.duration || 
                        (contract.total_amount && contract.daily_rate ? Math.round(contract.total_amount / contract.daily_rate) : null);
      
      if (storedDays && storedDays !== calculatedDays) {
        issues.push(\`⚠️ Durée incohérente: stockée \${storedDays}j vs calculée \${calculatedDays}j\`);
      }
    }
    
    // Calcul des montants
    if (contract.daily_rate && contract.contract_data?.rentalDays) {
      const calculatedTotal = contract.daily_rate * contract.contract_data.rentalDays;
      if (contract.total_amount && Math.abs(contract.total_amount - calculatedTotal) > 1) {
        issues.push(\`⚠️ Total incohérent: stocké \${contract.total_amount} DH vs calculé \${calculatedTotal} DH\`);
      }
    }
    
    if (issues.length > 0) {
      totalIssues += issues.length;
      if (issues.some(i => i.includes("❌"))) criticalIssues++;
      
      console.group(\`🔸 Contrat #\${contract.contract_number || contract.id} - \${contract.customer_name || 'N/A'}\`);
      issues.forEach(issue => console.log(issue));
      console.groupEnd();
    }
  });
  
  console.log(\`\\n📋 === RÉSUMÉ DU DIAGNOSTIC ===\`);
  console.log(\`✅ Contrats vérifiés: \${contracts.length}\`);
  console.log(\`⚠️ Total des problèmes: \${totalIssues}\`);
  console.log(\`❌ Problèmes critiques: \${criticalIssues}\`);
  
  if (totalIssues > 0) {
    console.log("\\n🔧 RECOMMANDATION: Cliquez sur le bouton 'Corriger les calculs incohérents' dans l'interface pour résoudre automatiquement ces problèmes.");
  } else {
    console.log("\\n✨ Excellent! Aucune incohérence détectée.");
  }
})();
`;
}

/**
 * Backup des contrats avant migration
 */
export function backupContracts(): void {
  const contracts = localStorage.getItem('contracts');
  const payments = localStorage.getItem('payments');
  const timestamp = new Date().toISOString();
  
  if (contracts) {
    localStorage.setItem(`contracts_backup_${timestamp}`, contracts);
  }
  if (payments) {
    localStorage.setItem(`payments_backup_${timestamp}`, payments);
  }
  
  console.log(`✅ Sauvegarde créée: contracts_backup_${timestamp}`);
}
