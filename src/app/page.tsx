"use client";
import {
  Button,
  Container,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Unstable_Grid2";
import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
} from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { Hash } from "@polkadot/types/interfaces";
import { AccountData } from "@polkadot/types/interfaces/balances/types";
import React, { useEffect, useState } from "react";

import styles from "./page.module.css";

function App() {
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [recipient, setRecipient] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [api, setApi] = useState<ApiPromise>();
  const [balances, setBalances] = React.useState<{
    [key: string]: string;
  }>({});

  const [rawTransaction, setRawTransaction] = React.useState<string>("");

  useEffect(() => {
    enableExtension().then(() => {
      setStatus("Connected");
      setupApi();
    });
  }, []);

  async function enableExtension() {
    await web3Enable("Polkadot Wallet App");
    const accs = await web3Accounts();
    setAccounts(accs);
  }

  async function setupApi() {
    const wsProvider = new WsProvider("wss://westend-rpc.polkadot.io/");
    const api = await ApiPromise.create({ provider: wsProvider });
    setApi(api);
    setStatus("Api initialized");
  }

  async function loadBalances() {
    for (const account of accounts.map((acc) => acc.address)) {
      const data = await api!.query.system.account(account);
      const jsonData: { data: AccountData } =
        (await data.toJSON()) as unknown as {
          data: AccountData;
        };

      const balance = jsonData.data.free;

      setBalances((balances) => ({
        ...balances,
        [account]: (+balance.toString() / 10 ** 12).toFixed(2),
      }));
    }
  }

  React.useEffect(() => {
    if (api && accounts.length) {
      loadBalances();
    }
  }, [api, accounts.map((acc) => acc.address).join("")]);

  const send = async (fn: () => Promise<Hash>) => {
    if (!api) {
      setStatus("API not initialized");
      return;
    }

    try {
      const txHash = await fn();

      setStatus(`Transaction sent. Tx Hash: ${txHash.toString()}`);
    } catch (error: any) {
      console.log(error);
      setStatus(
        "Error sending transaction: " + error?.message || error?.toString
      );
    }
    loadBalances();
  };

  async function makeSendTransaction() {
    const amount = 10 ** 12; // 1 DOT in planck (12 decimals)
    return api!.tx.balances.transfer(recipient, amount);
  }

  async function makeRaw() {
    try {
      const tx = await makeSendTransaction();
      const rawTransaction = tx.toHex();

      setRawTransaction(rawTransaction);
      setStatus(`Raw created: ${rawTransaction}`);
    } catch (error: any) {
      console.log(error);
      setStatus(
        "Error sending transaction: " + error?.message || error?.toString
      );
    }
  }

  async function sendRaw(raw: string) {
    await send(async () => {
      const senderAddress = accounts[0].address;
      const tx = api!.tx(raw);

      const injector = await web3FromAddress(senderAddress);
      return tx.signAndSend(senderAddress, { signer: injector.signer });
    });
    setRawTransaction("");
  }

  async function signRaw(raw: string) {
    const senderAddress = accounts[0].address;
    const tx = api!.tx(raw);

    const injector = await web3FromAddress(senderAddress);

    const data = await tx.signAsync(senderAddress, { signer: injector.signer });
    setStatus(data.toString());
  }

  return (
    <div className={styles.main}>
      <Container>
        <Grid container spacing={2}>
          <Grid xs={12}>
            <h1>Polkadot Demo dApp</h1>
          </Grid>
          <Grid xs={12}>
            <h2>Accounts</h2>
          </Grid>
          <Grid xs={12}>
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} aria-label="simple table">
                <TableHead>
                  <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell align="right">Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {accounts.map((acc) => (
                    <TableRow key={acc.address}>
                      <TableCell>{acc.address}</TableCell>
                      <TableCell align="right">
                        {balances[acc.address] || "0"}DOT
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid xs={12}>
            <h2>Recipient Address</h2>
          </Grid>
          <Grid xs={12}>
            <TextField
              label="Address"
              variant="outlined"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              fullWidth
            />
          </Grid>

          <Grid xs={12}>
            <Stack spacing={2} direction="row">
              <Button variant="contained" onClick={makeRaw}>
                Make Raw
              </Button>
            </Stack>
          </Grid>

          <Grid xs={12}>
            <h2>Raw transaction</h2>
          </Grid>
          <Grid xs={12}>
            <TextField
              label="String"
              variant="outlined"
              value={rawTransaction}
              onChange={(e) => setRawTransaction(e.target.value)}
              fullWidth
              multiline
              rows={4}
            />
          </Grid>

          <Grid xs={12}>
            <Stack spacing={2} direction="row">
              <Button
                variant="contained"
                disabled={!rawTransaction.length}
                onClick={() => sendRaw(rawTransaction)}
              >
                Send Raw
              </Button>
              <Button
                variant="outlined"
                disabled={!rawTransaction.length}
                onClick={() => signRaw(rawTransaction)}
              >
                Sign Raw
              </Button>
            </Stack>
          </Grid>

          <Grid xs={12}>
            <h2>Status</h2>
          </Grid>
          <Grid xs={12}>{status}</Grid>
        </Grid>
      </Container>
    </div>
  );
}

export default App;
