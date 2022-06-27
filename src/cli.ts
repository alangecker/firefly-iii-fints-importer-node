import { ArgumentParser } from 'argparse'
import kleur from 'kleur'
import prompts from 'prompts'
import ProgressBar from 'progress'
import { getFileTransactions, getTransactions, Transaction } from './bank'
import { getAccounts, importTransaction } from './firefly'
import { convertTransaction } from './convert'
import { getAccountList, getConfigForIBAN } from './config'
import { formatIBAN } from './utils'

const parser = new ArgumentParser({description: 'Firefly III importer'})
parser.add_argument('--config', { help: 'config file in YAML format', required: true })
parser.add_argument('--months', { help: 'count of past months to import' })
parser.add_argument('--start_date', { help: 'start date to import from Bank (YYYY-MM-DD)' })
parser.add_argument('--end_date', { help: 'end date to import from Bank (YYYY-MM-DD)' })
parser.add_argument('--import_file', { help: '', })
parser.add_argument('-n', { action: 'store_const', const: true, help: 'run non-interactively', })
const group = parser.add_mutually_exclusive_group({required: true})
group.add_argument('--iban', { help: 'The Account to select' })
group.add_argument('--all', { action: 'store_const', const: true, help: 'run all configured accounts', })

const args = parser.parse_args()


async function runAccount(iban: string, startDate: Date, endDate: Date) {
    const config = getConfigForIBAN(iban)

    const fireflyAccounts = await getAccounts(config.firefly.url, config.firefly.token)
    const fireflyAccount = fireflyAccounts.find(a => parseInt(a.id) == config.firefly.accountId)
    if(!fireflyAccount) {
        throw new Error(`No Firefly III account found with id '${args.account_id}'`)
    }

    console.log(kleur.bold('         Config: ')+config.name)
    console.log(kleur.bold('           IBAN: ')+formatIBAN(iban))
    console.log(kleur.bold('Firefly-Account: ')+fireflyAccount.attributes.name+` (${config.firefly.accountId})`)
    console.log(kleur.bold(' Firefly-Server: ')+config.firefly.url)
   
    if(fireflyAccount.attributes.iban !== iban) {
        console.log(kleur.bold('    Firely-IBAN: ')+formatIBAN(fireflyAccount.attributes.iban))
        throw new Error('IBAN of firefly account does not match the bank IBAN. wrong account configured?')
    }

    let txs: Transaction[] = []
    if(args.import_file) {
        console.log(`loading transactions from ${args.import_file}`)
        txs = getFileTransactions(args.import_file)
    } else {
        console.log(`get transactions from bank (${config.bank.blz})`)
        txs = await getTransactions(config.bank, startDate, endDate, iban)
    }
    txs = txs.filter(tx => tx.amount)

    if(!txs.length) {
        console.log('No transactions found')
        return
    }
    const first = txs[0]
    const last = txs[txs.length-1]
    console.log(`found ${txs.length} transactions (${first.valueDate} - ${last.valueDate})`)
    if(!args.n) {
        const con = await prompts({
            type: 'confirm',
            name: 'value',
            message: 'Execute import?',
            initial: true
        })
        if(!con.value) {
            process.exit()
        }
    }
    const bar = new ProgressBar('importing :bar :current/:total', {
        width: 20,
        total: txs.length,
        complete: '\u2588',
        incomplete: '\u2591'
    })
    let newlyCount = 0
    for(let tx of txs) {
        const convertedTx = convertTransaction(tx, config.firefly.accountId)
        const newly = await importTransaction(
            config.firefly.url,
            config.firefly.token,
            convertedTx
        )
        if(newly) newlyCount++
        bar.tick()
    }
    console.log(kleur.bold('Result: ')+`${newlyCount} new, ${txs.length-newlyCount} duplicated`)
}

void async function main() {
    try {
        let endDate = new Date();
    
        let startDate = new Date(endDate);
        if(args.months && (args.start_date || args.end_date)) {
            throw new Error(`can't use argument --months together with --start_date or --end_date`)
        }
        startDate.setMonth(startDate.getMonth()-(parseInt(args.months) || 3))
        startDate.setDate(startDate.getDate()+2)
        if(!args.months) {
            if(args.start_date) {
                if(!args.start_date.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error('invalid start date provided. it must be in form YYYY-MM-DD')
                startDate = new Date(args.start_date)
            }
            if(args.end_date) {
                if(!args.end_date.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error('invalid end date provided. it must be in form YYYY-MM-DD')
                endDate = new Date(args.end_date)
            }
        }
       
        if(args.all) {
            if(args.import_file) {
                throw new Error(`importing a file to all accounts doesn't make any sense. please specify a single one with --iban`)
            }
            const accounts = getAccountList()
            for(let account of accounts) {
                await runAccount(account.bank_iban, startDate, endDate)
            }
            console.log(kleur.blue('======================================'))
        } else {
            await runAccount(args.iban, startDate, endDate)
        }

    } catch(err) {
        console.log(kleur.red().bold(err.name+': ')+err.message)
        console.log(kleur.blue().dim(err.stack.split('\n').slice(1,4).join('\n')))
    }
}()
