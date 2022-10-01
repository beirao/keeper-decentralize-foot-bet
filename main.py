from web3 import Web3
import yaml, os, json, logging
from solcx import compile_standard, install_solc
from dotenv import load_dotenv
import sqlite3 as db
from datetime import datetime

# Global var
load_dotenv() 
with open("ext/config-keeper.yaml", "r") as stream:
    try:
        config = yaml.safe_load(stream)
    except yaml.YAMLError as exc:
        print(exc)

def init() :
    # install the solidity version
    print("Installing...")
    install_solc("0.8.16")
    chainId = config["chainId"]

    logging.basicConfig(filename=config["logPath"], level=logging.INFO,
            format="%(asctime)s %(levelname)s %(message)s")

    # Solidity source code
    with open("./contracts/Bet.sol", "r") as file:
        bet_file = file.read()

        compiled_sol_bet = compile_standard(
        {
            "language": "Solidity",
            "sources": {"Bet.sol": {"content": bet_file}},
            "settings": {
                "outputSelection": {
                    "*": {
                        "*": ["abi", "metadata", "evm.bytecode", "evm.bytecode.sourceMap"]
                    }
                }
            },
        },
        solc_version="0.8.16",
    )

    with open("compiled_code_bet.json", "w") as file:
        json.dump(compiled_sol_bet, file)

    # get bytecode
    bytecodeBet = compiled_sol_bet["contracts"]["Bet.sol"]["Bet"]["evm"][
        "bytecode"
    ]["object"]


    # get abi
    abiBet = json.loads(
        compiled_sol_bet["contracts"]["Bet.sol"]["Bet"]["metadata"]
    )["output"]["abi"]

    w3 = Web3(Web3.HTTPProvider(os.getenv('GOERLI_RPC_URL')))
    my_address = os.getenv('PUBLIC_KEY')
    private_key = os.getenv('PRIVATE_KEY')

    return w3, my_address, private_key, abiBet, bytecodeBet, chainId



def ckeckUpkeepPy(address, w3, abiBet) :
    bet = w3.eth.contract(address=address,abi=abiBet)
    tx = bet.functions.checkUpkeep("0x").call()
    return bet, tx[0]

def perfUpkeepPy(bet, w3,chainId, my_address, private_key) :
    nonce = w3.eth.getTransactionCount(my_address)
    tx = bet.functions.performUpkeep("0x").buildTransaction(
        {
            "chainId": chainId,
            # "gasPrice": w3.eth.gas_price,
            "from": my_address,
            "nonce": nonce,
        }) 
    signed_txn = w3.eth.account.sign_transaction(tx, private_key=private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    return tx_receipt

def main() :
    w3, my_address, private_key, abiBet, bytecodeBet, chainId = init()

    connection = db.connect(config["databasePath"])
    cursor = connection.cursor()
    reqBD = cursor.execute(f'SELECT match_id, address, date FROM matches WHERE isDeployed = ?',(1,))
    allDeployedBet = reqBD.fetchall()
    print(allDeployedBet)

    for match_id, addr, date in allDeployedBet : 
        try :
            bet, isUpkeepNeeded = ckeckUpkeepPy(addr, w3, abiBet)
            print("ckeckUpkeep : ", isUpkeepNeeded)

            if isUpkeepNeeded :
                tx_receipt = perfUpkeepPy(bet, w3,chainId, my_address, private_key)
                logging.info(f"{match_id} performUpkeep")
                print(tx_receipt['status'])
        except Exception as e :
            print("Error :",e)
            logging.error(f"Error upkeep {match_id} : {e}")

    # update BD
    now = int(datetime.timestamp(datetime.now()))
    for matchId, addr, date in allDeployedBet : 
        if now > date + config["timeoutKeeperNeeded"] * 24 * 60 * 60 :
            cursor.execute("UPDATE matches SET isDeployed = 2 WHERE match_id = ?", (matchId,))
            logging.info(f"{match_id} timeout")

        connection.commit()
            

if __name__ == "__main__":
    main()