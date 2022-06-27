import axios, { AxiosError } from 'axios'
import url from 'url'

export interface FireflyTransaction {
    type: "withdrawal" | "deposit";
    date: string;
    amount: number;
    description?: string;
    source_name: string|null
    source_id?: number|null
    source_iban?: string|null
    destination_name: string|null
    destination_id?: number|null
    destination_iban?: string|null
    currency_code?: string;
    foreign_amount?: number;
    notes?: string|null;
    sepa_ct_id?: string
    external_id?: string;
    foreign_currency_code?: string;
}


export async function getAccounts(url: string, token: string): Promise<Array<{id: string, attributes: any}>> {
    if(url[url.length-1] == '/') url = url.slice(0, url.length-1)
    const res = await axios.get(url+'/api/v1/accounts?type=asset', {
        headers: {
            Authorization: 'Bearer '+token
        }
    })
    return res.data.data
}

export async function importTransaction(url: string, token: string, tx: FireflyTransaction): Promise<boolean> {
    if(url[url.length-1] == '/') url = url.slice(0, url.length-1)

    try {
        const res = await axios.post(url+'/api/v1/transactions', {
            apply_rules: true,
            error_if_duplicate_hash: true,
            transactions: [tx]
        }, {
            headers: {
                Authorization: 'Bearer '+token
            }
        })
        return true
    } catch(err) {
        if(err instanceof AxiosError && err.response?.data?.message) {
            if(err.response.data.message.startsWith('Duplicate')) {
                return false
            } else {
                console.log(tx)
                throw new Error(err.response.data.message)
            }
        } else {
            throw err
        }
    }

}
