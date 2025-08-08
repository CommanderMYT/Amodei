import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import Stripe from "stripe";
import rateLimit from "express-rate-limit";

const app = express();

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
});
app.use(limiter);

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Root route
app.get("/", (req, res) => {
  res.send("🎉 AI 3D Model Creator backend is running!");
});

// POST /generate - Call Sloyd.ai API
app.post("/generate", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const response = await fetch("https://api.sloyd.ai/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SLOYD_API_KEY}`,
      },
      body: JSON.stringify({ prompt, output: "stl" }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Sloyd API error:", errorBody);
      return res.status(500).json({ error: "Failed to generate model from AI service" });
    }

    const data = await response.json();
    if (!data.modelUrl) {
      return res.status(500).json({ error: "AI service did not return a model URL" });
    }

    res.json({ modelUrl: data.modelUrl });
  } catch (err) {
    console.error("Error calling Sloyd API:", err);
    res.status(500).json({ error: "Error generating model" });
  }
});

// POST /create-checkout-session - Create Stripe checkout session
app.post("/create-checkout-session", async (req, res) => {
  const { priceId } = req.body;

  if (!priceId) {
    return res.status(400).json({ error: "Price ID is required" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: priceId.includes("sub") ? "subscription" : "payment",
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel`,
      metadata: { modelId: req.body.modelId || "unknown" }, // Optional: track model ID
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe session creation error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// POST /webhook - Handle Stripe webhook for subscription events
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        // Handle successful checkout (e.g., log purchase, update user credits)
        console.log("Checkout completed:", session.id);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        // Handle subscription events (e.g., update user plan)
        console.log("Subscription event:", event.type);
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});