import bodyParser from "body-parser";
import express from "express";
import {BASE_ONION_ROUTER_PORT, BASE_USER_PORT, REGISTRY_PORT} from "../config";
import { createRandomSymmetricKey, symEncrypt, rsaEncrypt, exportSymKey } from "../crypto";

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

let lastReceivedMessage: string | null = null;
let lastSentMessage: string | null = null;

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  let lastCircuit: number[] | null = null;

  // Status route
  _user.get("/status", (req, res) => {
    res.send("live");
  });

  // Route to get the last circuit
  _user.get("/getLastCircuit", (req, res) => {
    res.json({ result: lastCircuit });
  });

  // Route to get the last received message
  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  // Route to get the last sent message
  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });

  // Route to receive messages
  _user.post("/message", (req, res) => {
    const { message } = req.body;
    lastReceivedMessage = message;
    res.send("success");
  });

  _user.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId } = req.body;

    // Get the list of nodes from the registry
    const nodes = await fetch(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`)
        .then((res) => res.json())
        .then((body: any) => body.nodes);

    // Create a random circuit of 3 nodes
    const circuit: number[] = [];
    while (circuit.length < 3) {
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
      if (!circuit.includes(randomNode.nodeId)) {
        circuit.push(randomNode.nodeId);
      }
    }

    // Encode the final destination (User 1's port) as a 10-character string
    const finalDestination = String(BASE_USER_PORT + destinationUserId).padStart(10, "0");

    // Prepend the destination to the message
    let encryptedMessage = finalDestination + message;

    // Encrypt the message in layers (onion encryption)
    for (let i = circuit.length - 1; i >= 0; i--) {
      const nodeId = circuit[i];
      const nodePubKey = nodes.find((n: { nodeId: number; }) => n.nodeId === nodeId)?.pubKey;

      if (nodePubKey) {
        // Generate a symmetric key for this layer
        const symKey = await createRandomSymmetricKey();
        const symKeyStr = await exportSymKey(symKey);

        // Encrypt the message with the symmetric key
        encryptedMessage = await symEncrypt(symKey, encryptedMessage);

        // Encrypt the symmetric key with the node's public key
        const encryptedSymKey = await rsaEncrypt(symKeyStr, nodePubKey);

        // Combine the encrypted symmetric key and the encrypted message
        encryptedMessage = encryptedSymKey + encryptedMessage;
      }
    }

    // Update the last sent message and circuit
    lastSentMessage = message;
    lastCircuit = circuit;

    // Send the encrypted message to the first node in the circuit
    await fetch(`http://localhost:${BASE_ONION_ROUTER_PORT + circuit[0]}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: encryptedMessage,
      }),
    });

    res.send("success");
  });


  // Start the server
  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(`User ${userId} is listening on port ${BASE_USER_PORT + userId}`);
  });

  return server;
}