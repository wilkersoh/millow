import { useEffect, useState } from "react";
import { ethers } from "ethers";

// Components
import Navigation from "./components/Navigation";
import Search from "./components/Search";
import Home from "./components/Home";

// ABIs
import RealEstate from "./abis/RealEstate.json";
import Escrow from "./abis/Escrow.json";

// Config
import config from "./config.json";

function App() {
  const [provider, setProvider] = useState();
  const [account, setAccount] = useState();
  const [escrow, setEscrow] = useState();

  useEffect(() => {
    loadBlockchanData();
  }, []);

  const loadBlockchanData = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    setProvider(provider);

    const network = await provider.getNetwork();

    const realEstateAddress = config[network.chainId].realEstate.address;
    const escrowAddress = config[network.chainId].escrow.address;

    const realEstate = new ethers.Contract(
      config[network.chainId].realEstate.address,
      RealEstate,
      provider
    );
    const totalSupply = await realEstate.totalSupply();

    const homes = [];
    for (var i = 1; i <= totalSupply; i++) {
      const uri = await realEstate.tokenURI(i);
      const response = await fetch(uri);
      const metadata = await response.json();
      homes.push(metadata);
    }

    console.log("homes: ", homes);

    const escrow = new ethers.Contract(
      config[network.chainId].escrow.address,
      Escrow,
      provider
    );
    setEscrow(escrow);

    window.ethereum.on("accountsChanged", async () => {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const account = ethers.utils.getAddress(accounts[0]);
      setAccount(account);
    });
  };

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />
      <Search />

      <div className="cards__section">
        <h3>Homes</h3>
        <hr />
        <div className="cards">
          <div className="card">
            <div className="card__image">
              <img src="" alt="Home" />
            </div>
            <div className="card__info">
              <h4>1 ETH</h4>
              <p>
                <strong>1</strong> bds | <strong>2</strong> ba |
                <strong> 3</strong> sqft
              </p>
              <p>1234 Elm St</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
