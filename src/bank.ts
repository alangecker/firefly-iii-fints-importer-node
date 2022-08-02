import { PinTanClient, PinTanClientConfig, Statement, Transaction, TanRequiredError } from "fints/src";
import { parse86Structured } from "fints/src/mt940-86-structured";
import prompts from 'prompts'
import kleur from 'kleur';
export { Transaction } from 'fints/src'
import * as fs from 'fs'
import { read } from 'mt940-js'
import { formatIBAN } from "./utils";


export function getFileTransactions(file: string): Transaction[] {
    const unprocessedStatements = read(fs.readFileSync(file));
    let out = []
    for(let statement of unprocessedStatements) {
        for(let transaction of statement.transactions) {
            const descriptionStructured = parse86Structured(transaction.description);
            out.push({ ...transaction, descriptionStructured });
        }
    }
    return out
}

export async function getTransactions(config: PinTanClientConfig, startDate: Date, endDate: Date, iban?: string): Promise<Transaction[]> {

    const client = new PinTanClient(config);
    const accounts = await client.accounts();
    let account: any = null
    if(iban) {
        account = accounts.find(a => a.iban == iban)
    } else if(accounts.length == 1) {
        account = accounts[0]
    } else {
        console.log(kleur.bold('Available Bank Accounts:'))
        accounts.forEach( (account, index) => {
            console.log(` ${index+1}: ${formatIBAN(account.iban)}`)
        })
        const response = await prompts({
            type: 'number',
            name: 'value',
            message: `Please select an account (1 - ${accounts.length})`,
            validate: value => value >= 1 && value <= accounts.length
        });
        account = accounts[response.value - 1]
    }

    if(!account) {
        throw new Error(`Account with IBAN '${iban}' not found. Available: ${accounts.map(a => a.iban).join(', ')}`)
    }
    let statements: Statement[] = []
    try {
        statements = await client.statements(account, startDate, endDate);
    } catch(err) {
        if(err instanceof TanRequiredError) {
            console.log(kleur.blue(err.challengeText))
            const response = await prompts({
                type: 'text',
                name: 'value',
                message: 'Please enter the TAN',
                validate: value => !value.match(/^[0-9]+$/) ? `only numbers allowed` : true
            });
            if(!response.value) throw new Error('no TAN provided')
            statements = await client.completeStatements(
                err.dialog,
                err.transactionReference,
                response.value,
            );
        } else {
            throw err
        }
    }
    const txs: Transaction[] = []
    for(let statement of statements) {
        txs.push(...statement.transactions)
    }
    return txs
}

