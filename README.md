# Firely III fints importer
This tool allows you to import transactions from your FinTS enabled bank into Firefly III.



## Requirements
- node >= v16 -> `node --version`
- yarn installed -> `yarn --version`

## Setup
```bash
git clone https://github.com/alangecker/firefly-iii-fints-importer-node.git
cd firefly-iii-fints-importer-node
yarn install
```

## Configuration
Copy and adjust the file configs/example.yaml


### Example Commands
```bash
# show help
yarn cli --help

# import new transactions from all bank accounts
yarn cli --config configs/myself.yaml --all

# import transactions from a single bank account
yarn cli --config configs/myself.yaml --iban DE58430609671220123300

# import transaction from a .mta file instead
yarn cli --config configs/myself.yaml --iban DE58430609671220123300 --import_file transactions.mta
```
