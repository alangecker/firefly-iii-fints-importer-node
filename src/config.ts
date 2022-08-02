import assert from "assert";
import { PinTanClientConfig } from "fints/src";
import * as fs from 'fs'
import * as path from 'path'
import YAML from 'yaml'

interface IConfig {
    name: string
    bank: PinTanClientConfig
    firefly: {
        url: string
        token: string
        accountId: number        
    }
}

function expectString(name: string, value: any) {
    assert(value !== undefined, `${name} is missing`) 
    assert(typeof value == 'string', `${name} must be a string`)
    assert(value, `${name} must not be empty`)
}
function expectNumber(name: string, value: any) {
    assert(value !== undefined, `${name} is missing`) 
    assert(typeof value == 'number', `${name} must be a string`)
    assert(value > 0, `${name} must be positive`)
    assert(Math.round(value) == value, `${name} must be a whole number`)
}


export function getAccountList(configFile: string): any[] {
    const file = fs.readFileSync(configFile, 'utf-8')
    const config = YAML.parse(file)
    assert(config.accounts && Array.isArray(config.accounts), "expect accounts to be an array")
    
    for(let account of config.accounts) {
        assert(account.name, "every account needs a name")
        try {
            expectString('name', account.name)
            expectString('bank_username', account.bank_username)
            expectString('bank_password', account.bank_password)
            expectString('bank_url', account.bank_url)
            expectString('bank_code', account.bank_code)
            expectString('bank_iban', account.bank_iban)
            expectString('firefly_url', account.firefly_url)
            expectString('firefly_access_token', account.firefly_access_token)
            expectNumber('firefly_account_id', account.firefly_account_id)
        } catch(err) {
            throw new Error(`Account ${account.name}: ${err.message}`)
        }
    }
    return config.accounts
}

export function getConfigForIBAN(iban: string, configFile: string): IConfig {
    const accounts = getAccountList(configFile)
    const account = accounts.find((a: any) => a.bank_iban == iban)

    if(!account) throw new Error(`no config found for IBAN '${iban}'`)

    return {
        name: account.name,
        bank: {
            url: account.bank_url,
            name: account.bank_username,
            pin: account.bank_password,
            blz: account.bank_code,
            productId: "9FA6681DEC0CF3046BFC2F8A6"
        },
        firefly: {
            url: account.firefly_url,
            token: account.firefly_access_token,
            accountId: account.firefly_account_id
        }
    }
}