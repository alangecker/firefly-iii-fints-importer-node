import { Transaction } from './bank'
import { FireflyTransaction } from './firefly'
import { isValidIBANNumber } from './utils'

export function convertTransaction(tx: Transaction, ourAccountId: number): FireflyTransaction {
    let iban = tx.descriptionStructured?.iban
    if(iban && !isValidIBANNumber(iban)) iban = undefined

    const source = tx.isCredit ? {
        name: tx.descriptionStructured?.name,
        iban: iban
    } : {
        id: ourAccountId,
        name: null
    }
    const dest = tx.isCredit ? {
        id: ourAccountId,
        name: null
    } : {
        name: tx.descriptionStructured?.name || "",
        iban: iban
    }
    return {
        type: tx.isCredit ? 'deposit' : 'withdrawal',
        date: tx.valueDate,
        amount: tx.amount,
        source_name: source.name || null,
        source_id: source.id || null,
        source_iban: source.iban || null,
        destination_name: dest.name,
        destination_id: dest.id || null,
        destination_iban: dest.iban || null,
        sepa_ct_id: tx.descriptionStructured?.reference?.endToEndRef?.trim() || "",
        notes: tx.descriptionStructured?.reference?.divergingPrincipal || null,
        description: tx.descriptionStructured?.reference?.text?.trim() || tx.descriptionStructured?.reference?.raw?.trim() || '-'
    }
    
}