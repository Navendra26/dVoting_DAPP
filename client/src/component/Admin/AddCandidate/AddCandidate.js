import React, { Component } from "react";

//import { Buffer } from "buffer";

import Navbar from "../../Navbar/Navigation";
import NavbarAdmin from "../../Navbar/NavigationAdmin";

import getWeb3 from "../../../getWeb3";
import Election from "../../../contracts/Election.json";

import AdminOnly from "../../AdminOnly";

import { create } from "ipfs-http-client";
// const ipfsClient = require("ipfs-http-client");
import "./AddCandidate.css";

const projectId = "28LuNAotbXzcvtpOcE9F8ayKOeP";
const projectSecret = "3de3d9c099c6c0c168e39b8bc03e2f7a";

const auth = "Basic " + btoa(`${projectId}:${projectSecret}`);
const client = create({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
  apiPath: "/api/v0",
  headers: {
    authorization: auth,
  },
});


export default class AddCandidate extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ElectionInstance: undefined,
      web3: null,
      accounts: null,
      isAdmin: false,
      header: "",
      slogan: "",
      file: undefined,
      ipfsHash: "",
      candidates: [],
      candidateCount: undefined,
    };
  }

  componentDidMount = async () => {
    // refreshing page only once
    if (!window.location.hash) {
      window.location = window.location + "#loaded";
      window.location.reload();
    }

    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = Election.networks[networkId];
      const instance = new web3.eth.Contract(
        Election.abi,
        deployedNetwork && deployedNetwork.address
      );
      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({
        web3: web3,
        ElectionInstance: instance,
        account: accounts[0],
      });

      // Total number of candidates
      const candidateCount = await this.state.ElectionInstance.methods
        .getTotalCandidate()
        .call();
      this.setState({ candidateCount: candidateCount });

      const admin = await this.state.ElectionInstance.methods.getAdmin().call();
      if (this.state.account === admin) {
        this.setState({ isAdmin: true });
      }

      // Loading Candidates details
      for (let i = 0; i < this.state.candidateCount; i++) {
        const candidate = await this.state.ElectionInstance.methods
          .candidateDetails(i)
          .call();
        this.state.candidates.push({
          id: candidate.candidateId,
          header: candidate.header,
          slogan: candidate.slogan,
          ipfsHash: candidate.ipfsHash,
        });
      }

      this.setState({ candidates: this.state.candidates });
    } catch (error) {
      // Catch any errors for any of the above operations.
      console.error(error);
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
    }
  };
  updateHeader = (event) => {
    this.setState({ header: event.target.value });
  };
  updateSlogan = (event) => {
    this.setState({ slogan: event.target.value });
  };

  //added
  retrieveFile = (e) => {
    const data = e.target.files[0];
    if (!data) {
      console.warn("No file selected for upload.");
      return; // Early exit if no file
    }  
    const reader = new window.FileReader();
    //reader.readAsArrayBuffer(data);
    reader.onloadend = () => {
      // Here, we create a new Uint8Array from the ArrayBuffer
      const buffer = new Uint8Array(reader.result);
      // Update the state with the buffer
      this.setState({ file: data, fileBuffer: buffer });
    };
    
    reader.readAsArrayBuffer(data);
    e.preventDefault();
  };

  handleUpload = async (e) => {
    e.preventDefault();

    try {
      const created = await client.add(this.state.file);
      //const url = `https://ipfs.infura.io/ipfs/${created.path}`;
      this.setState({ ipfsHash: created.path });
    } catch (error) {
      console.log(error.message);
    }
  };

  addCandidate = async () => {
    await this.state.ElectionInstance.methods
      .addCandidate(this.state.header, this.state.slogan, this.state.ipfsHash)
      .send({ from: this.state.account, gas: 1000000 });
    this.setState({ ipfsHash: "" });
    window.location.reload();
  };

  render() {
    if (!this.state.web3) {
      return (
        <>
          {this.state.isAdmin ? <NavbarAdmin /> : <Navbar />}
          <center>Loading Web3, accounts, and contract...</center>
        </>
      );
    }
    if (!this.state.isAdmin) {
      return (
        <>
          <Navbar />
          <AdminOnly page="Add Candidate Page." />
        </>
      );
    }
    return (
      <>
        <NavbarAdmin />
        <div className="container-main">
          <h2>Add a new candidate</h2>
          <small>Total candidates: {this.state.candidateCount}</small>
          <div className="container-item">
            <form className="form">
              <label className={"label-ac"}>
                Header
                <input
                  className={"input-ac"}
                  type="text"
                  placeholder="eg. Marcus"
                  value={this.state.header}
                  onChange={this.updateHeader}
                />
              </label>
              <label className={"label-ac"}>
                Slogan
                <input
                  className={"input-ac"}
                  type="text"
                  placeholder="eg. It is what it is"
                  value={this.state.slogan}
                  onChange={this.updateSlogan}
                />
              </label>
              <label className={"label-ac"}>
                Candidate Image
                <input
                  className={"input-ac"}
                  type="file"
                  onChange={this.retrieveFile}
                />
              </label>
              <input
                  type="button"
                  className="button"
                  onClick={this.handleUpload}
                  value="Upload"
              >                  
              </input>

              <div className="display">
                {this.state.ipfsHash.length !== 0 && (
                  <img
                    src={`https://ipfs.infura.io/ipfs/${this.state.ipfsHash}`}
                    width={100}
                    height={100}
                    alt=""
                  />
                )}
              </div>

              <button
                className="btn-add"
                disabled={
                  this.state.header.length < 3 || this.state.header.length > 21
                }
                onClick={this.addCandidate}
              >
                Add
              </button>
            </form>
          </div>
        </div>
        {loadAdded(this.state.candidates)}
      </>
    );
  }
}
export function loadAdded(candidates) {
  const renderAdded = (candidate) => {
    return (
      <>
        <div className="container-list success">
          <div
            style={{
              maxHeight: "21px",
              overflow: "auto",
            }}
          >
            {candidate.id}. <strong>{candidate.header}</strong>:{" "}
            {candidate.slogan}
          </div>
          <div className="display">
            <img
              src={`https://ipfs.infura.io/ipfs/${candidate.ipfsHash}`}
              width={100}
              height={100}
              alt=""
            />
          </div>
        </div>
      </>
    );
  };
  return (
    <div className="container-main" style={{ borderTop: "1px solid" }}>
      <div className="container-item info">
        <center>Candidates List</center>
      </div>
      {candidates.length < 1 ? (
        <div className="container-item alert">
          <center>No candidates added.</center>
        </div>
      ) : (
        <div
          className="container-item"
          style={{
            display: "block",
            backgroundColor: "#DDFFFF",
          }}
        >
          {candidates.map(renderAdded)}
        </div>
      )}
    </div>
  );
}
