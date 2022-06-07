require("@nomiclabs/hardhat-waffle");
require("dotenv").config({path:".env"})

const NODE_URL = process.env.NODE_URL
const RINKEBY_PRIVATE_KEY = process.env.RINKEBY_PRIVATE_KEY

module.exports = {
  solidity: "0.8.4",
  networks: {
    rinkeby: {
      url: NODE_URL,
      accounts: [RINKEBY_PRIVATE_KEY],
    }
  }
}
