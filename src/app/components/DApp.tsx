"use client";
import {
  Button,
  Container,
  Link,
  Radio,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Unstable_Grid2";
import { ApiPromise, WsProvider } from "@polkadot/api";
import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
} from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { AccountData } from "@polkadot/types/interfaces/balances/types";
import React, { useEffect, useState } from "react";

const getLocalStorageValue = (key: string, defaultValue = ""): string => {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return window.localStorage.getItem(key) || defaultValue;
  }
  return defaultValue;
};

const setLocalStorageValue = (key: string, value: string) => {
  if (typeof window !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return window.localStorage.setItem(key, value);
  }
};

const explorerUrl = (hash: string) =>
  `https://westend.subscan.io/extrinsic/${hash}`;

function DApp() {
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [recipient, setRecipient] = useState<string>("");
  const [status, setStatus] = useState<string | string[]>("");
  const [api, setApi] = useState<ApiPromise>();
  const [balances, setBalances] = React.useState<{
    [key: string]: string;
  }>({});
  const [apiUrl, set_apiUrl] = React.useState<string>(
    getLocalStorageValue("API_URL", "wss://westend-rpc.polkadot.io/")
  );

  const [rawTransaction, setRawTransaction] = React.useState<string>("");
  const [signedTransaction, set_signedTransaction] = React.useState<string>("");
  const [selectedAccount, set_selectedAccount] = React.useState<{
    address: string;
    source: string;
  }>();

  React.useEffect(() => {
    setLocalStorageValue("API_URL", apiUrl);
    setupApi();
  }, [apiUrl]);

  useEffect(() => {
    enableExtension().then(() => {
      setStatus("Connected");
      setupApi();
    });
  }, []);

  async function enableExtension() {
    await web3Enable("Polkadot Wallet App");
    const accounts = await web3Accounts();
    setAccounts(accounts);
    if (accounts.length) {
      const [
        {
          address,
          meta: { source },
        },
      ] = accounts;
      set_selectedAccount({ address, source });
    }
  }

  async function setupApi() {
    const wsProvider = new WsProvider(apiUrl);
    const api = await ApiPromise.create({ provider: wsProvider });
    setApi(api);
    setStatus(`Api initialized. Api URL: ${apiUrl}`);
  }

  async function loadBalances() {
    for (const account of accounts.map((acc) => acc.address)) {
      const data = await api!.query.system.account(account);
      const jsonData: { data: AccountData } = data.toJSON() as unknown as {
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

  const withApi = async (callback: (api: ApiPromise) => Promise<void>) => {
    if (!api) {
      setStatus("API not initialized");
      return;
    }

    try {
      await callback(api);
    } catch (error: any) {
      console.log(error);
      setStatus(error?.message || error?.toString());
    }
  };

  const withSender = async (
    callback: (sender: InjectedAccountWithMeta) => Promise<void>
  ) => {
    const sender = accounts.find(
      ({ address, meta: { source } }) =>
        address === selectedAccount?.address &&
        source === selectedAccount?.source
    );

    if (sender) {
      try {
        await callback(sender);
      } catch (e: any) {
        console.log(e);
        setStatus(e?.message || e.toString());
      }
    } else {
      setStatus("Can not find sender");
    }
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

  async function signRaw(raw: string) {
    await withSender(async (sender) => {
      await withApi(async (api) => {
        const senderAddress = sender.address;
        const tx = api.tx(raw);
        const injector = await web3FromAddress(senderAddress);
        const data = await tx.signAsync(senderAddress, {
          signer: injector.signer,
        });
        setStatus(data.toString());
        set_signedTransaction(data.toHex());
      });
    });
  }

  async function sendSigned(signedTransaction: string) {
    await withApi(async (api) => {
      const txHash = await api.tx(signedTransaction).send();

      setStatus(["Transaction sent.", explorerUrl(txHash.toString())]);
      set_signedTransaction("");
    });
  }

  return (
    <Container>
      <Grid container spacing={2}>
        <Grid xs={12}>
          <h2>Api URL</h2>
        </Grid>
        <Grid xs={12}>
          <TextField
            label="Address"
            variant="outlined"
            value={apiUrl}
            onChange={(e) => set_apiUrl(e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid xs={12}>
          <h2>Accounts</h2>
        </Grid>
        <Grid xs={12}>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Account</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell align="right">Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map(({ address, meta: { source } }) => (
                  <TableRow key={`${address}${source}`}>
                    <TableCell padding="checkbox">
                      <Radio
                        value={{ address, source }}
                        onChange={() => {
                          set_selectedAccount({ address, source });
                        }}
                        checked={
                          selectedAccount?.source === source &&
                          selectedAccount?.address === address
                        }
                      />
                    </TableCell>
                    <TableCell>{address}</TableCell>
                    <TableCell>{source}</TableCell>
                    <TableCell align="right">
                      {balances[address] || "0"}DOT
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
        <Grid xs={12}>
          <h2>
            Demo: transfer to {"<"}Recipient{">"} Address 1 DOT
          </h2>
        </Grid>
        <Grid xs={12}>
          <TextField
            label="Recipient"
            variant="outlined"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            fullWidth
          />
        </Grid>

        <Grid xs={12}>
          <Stack spacing={2} direction="row">
            <Button
              variant="contained"
              onClick={makeRaw}
              disabled={recipient.length === 0}
            >
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
              variant="outlined"
              disabled={!rawTransaction.length}
              onClick={() => signRaw(rawTransaction)}
            >
              Sign transaction
            </Button>
          </Stack>
        </Grid>

        <Grid xs={12}>
          <h2>Signed transaction</h2>
        </Grid>
        <Grid xs={12}>
          <TextField
            label="String"
            variant="outlined"
            value={signedTransaction}
            onChange={(e) => set_signedTransaction(e.target.value)}
            fullWidth
            multiline
            rows={4}
          />
        </Grid>
        <Grid xs={12}>
          <Stack spacing={2} direction="row">
            <Button
              disabled={!signedTransaction.length}
              variant="contained"
              onClick={() => sendSigned(signedTransaction)}
            >
              Send Signed
            </Button>
          </Stack>
        </Grid>

        <Grid xs={12}>
          <h2>Status</h2>
        </Grid>
        <Grid xs={12}>
          <Typography variant="overline">
            {Array.isArray(status) ? (
              <>
                {status[0]} <Link href={status[1]}>Open in Explorer</Link>
              </>
            ) : (
              status
            )}
          </Typography>
        </Grid>
      </Grid>
    </Container>
  );
}

export default DApp;
