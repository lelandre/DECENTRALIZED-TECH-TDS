import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";
import {
  generateRsaKeyPair,
  exportPubKey,
  exportPrvKey,
  rsaDecrypt,
  importPrvKey,
  importSymKey,
  symDecrypt
} from "../crypto";

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  let lastReceivedEncryptedMessage: string | null = null;
  let lastReceivedDecryptedMessage: string | null = null;
  let lastMessageDestination: number | null = null;
  let privateKey: string | null = null;

  // Generate RSA key pair and register the node
  const { publicKey, privateKey: prvKey } = await generateRsaKeyPair();
  const pubKey = await exportPubKey(publicKey);
  privateKey = await exportPrvKey(prvKey);

  // Register the node with the registry
  await fetch(`http://localhost:${REGISTRY_PORT}/registerNode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nodeId,
      pubKey,
    }),
  });

  // Status route
  onionRouter.get("/status", (req, res) => {
    res.send("live");
  });

  // GET routes
  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });

  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });

  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination });
  });

  // Route to get the private key
  onionRouter.get("/getPrivateKey", (req, res) => {
    res.json({ result: privateKey });
  });

  onionRouter.post("/message", async (req, res) => {
    const { message } = req.body;

    // Update the last received encrypted message
    lastReceivedEncryptedMessage = message;

    // Decrypt the outer layer of the message
    const encryptedSymKey = message.slice(0, 344); // RSA-encrypted symmetric key
    const encryptedMessage = message.slice(344); // Symmetrically encrypted message (Base64 + IV)

    try {
      // Decrypt the symmetric key with the node's private key
      const symKeyStr = await rsaDecrypt(encryptedSymKey, await importPrvKey(privateKey!));
      const symKey = await importSymKey(symKeyStr);

      // Decrypt the message with the symmetric key
      const decryptedMessage = await symDecrypt(symKeyStr, encryptedMessage);

      // Update the last received decrypted message
      lastReceivedDecryptedMessage = decryptedMessage;

      // Extract the next destination (first 10 characters)
      const nextDestinationStr = decryptedMessage.slice(0, 10);
      const nextDestination = parseInt(nextDestinationStr, 10);

      // Validate the next destination
      if (isNaN(nextDestination)) {
        throw new Error(`Invalid destination port: ${nextDestinationStr}`);
      }

      lastMessageDestination = nextDestination;

      // Forward the remaining message to the next destination
      await fetch(`http://localhost:${nextDestination}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: decryptedMessage.slice(10), // Remove the destination part
        }),
      });

      res.send("success");
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).send("Error processing message");
    }
  });

  // Start the server
  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
        `Onion router ${nodeId} is listening on port ${
            BASE_ONION_ROUTER_PORT + nodeId
        }`
    );
  });

  return server;
}