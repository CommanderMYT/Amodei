/**
 * 3D Model Magic - A professional React application for AI-powered 3D model generation.
 * Designed to produce Bambu Lab competition-worthy designs with advanced AI capabilities,
 * secure payments, and a slick, modern UI.
 *
 * Dependencies (included in index.html or Vite):
 * - React 17
 * - Firebase 8.10.1
 * - Framer Motion 6.5.1
 * - React Toastify 9.0.8
 * - Tailwind CSS 2.2.19
 * - Google Model Viewer
 * - Google Analytics
 *
 * Backend Requirements:
 * - Netlify Functions or Node.js/Express server with endpoints:
 *   - /generate: AI model generation
 *   - /create-checkout-session: Stripe checkout
 *   - /get-user-plan: Fetch user subscription
 *   - /get-csrf-token: CSRF protection
 * - Meshy AI or similar 3D model generation API
 * - Stripe account with price IDs
 * - Firebase project for authentication
 *
 * Deployment:
 * - Use Vite to build and host on Netlify/Vercel.
 * - Replace placeholder URLs and keys (e.g., Firebase config, Stripe price IDs).
 *
 * Features:
 * - Advanced text-to-3D and image-to-3D generation
 * - Customizable model parameters (material, supports, shell thickness, infill)
 * - Secure Firebase authentication
 * - Stripe payments for subscriptions and one-time purchases
 * - Interactive model gallery with competition-quality examples
 * - Analytics, accessibility, and security
 */

import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import firebase from 'firebase/app';
import 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Firebase configuration (replace with your Firebase project details)
const firebaseConfig = {
  apiKey: "your-firebase-api-key",
  authDomain: "your-firebase-auth-domain",
  projectId: "your-firebase-project-id",
  storageBucket: "your-firebase-storage-bucket",
  messagingSenderId: "your-firebase-messaging-sender-id",
  appId: "your-firebase-app-id"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Google Analytics tracking
const trackEvent = (category, action, label) => {
  if (window.gtag) {
    window.gtag('event', action, { event_category: category, event_label: label });
  }
};

// Helper: Validate numeric dimension fields
function validDimension(v) {
  if (!v) return false;
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

// Helper: Sanitize input to prevent XSS
function sanitizeInput(input) {
  return input.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;'
  })[m]);
}

// Example models for gallery (Bambu Lab competition-worthy)
const EXAMPLE_MODELS = [
  {
    id: 1,
    name: "Intricate Gearbox",
    url: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
    desc: "A precision-engineered gearbox with interlocking components, optimized for Bambu Lab printers.",
    tags: ["mechanical", "functional", "engineering"]
  },
  {
    id: 2,
    name: "Sculpted Dragon",
    url: "https://modelviewer.dev/shared-assets/models/RobotExpressive.glb",
    desc: "A detailed dragon sculpture with intricate scales, ideal for artistic prints.",
    tags: ["artistic", "sculpture", "fantasy"]
  },
  {
    id: 3,
    name: "Modular Shelving Unit",
    url: "https://modelviewer.dev/shared-assets/models/shader-ball.glb",
    desc: "A customizable shelving unit with snap-fit connectors for home organization.",
    tags: ["furniture", "functional", "modular"]
  },
  {
    id: 4,
    name: "Robotic Arm Joint",
    url: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
    desc: "A high-tolerance robotic arm joint for automation projects.",
    tags: ["mechanical", "robotics", "engineering"]
  },
  {
    id: 5,
    name: "Futuristic Headset",
    url: "https://modelviewer.dev/shared-assets/models/RobotExpressive.glb",
    desc: "A sleek, ergonomic headset design for VR/AR applications.",
    tags: ["electronics", "wearable", "futuristic"]
  },
  {
    id: 6,
    name: "Ornate Vase",
    url: "https://modelviewer.dev/shared-assets/models/shader-ball.glb",
    desc: "An elegant vase with intricate patterns, perfect for decorative prints.",
    tags: ["artistic", "decor", "home"]
  },
  {
    id: 7,
    name: "Drone Frame",
    url: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
    desc: "A lightweight, durable drone frame optimized for Bambu Lab’s precision.",
    tags: ["aerospace", "functional", "engineering"]
  },
  {
    id: 8,
    name: "Puzzle Cube",
    url: "https://modelviewer.dev/shared-assets/models/RobotExpressive.glb",
    desc: "A complex, interlocking puzzle cube for intellectual challenges.",
    tags: ["puzzle", "recreational", "complex"]
  },
  {
    id: 9,
    name: "Car Dashboard Mount",
    url: "https://modelviewer.dev/shared-assets/models/shader-ball.glb",
    desc: "A robust mount for car dashboards, designed for perfect fit and durability.",
    tags: ["automotive", "functional", "practical"]
  },
  {
    id: 10,
    name: "Architectural Miniature",
    url: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
    desc: "A detailed miniature building for architectural visualization.",
    tags: ["architecture", "artistic", "model"]
  }
];

// Subscription plans with Stripe price IDs (replace with real IDs)
const PLANS = [
  {
    id: "free",
    title: "Free",
    desc: "Try one sample model with basic features and preview capabilities.",
    priceLabel: "Free",
    priceId: null,
    color: "bg-gray-700",
    cta: "Get Started",
    disabled: false,
    features: [
      "1 model generation/month",
      "Basic text-to-3D",
      "GLB export",
      "Standard preview"
    ]
  },
  {
    id: "basic",
    title: "Basic",
    desc: "10 high-quality models per month, perfect for hobbyists and small projects.",
    priceLabel: "$9 / month",
    priceId: "price_1N9Z8x1234567890",
    color: "bg-yellow-500",
    cta: "Subscribe",
    disabled: false,
    features: [
      "10 model generations/month",
      "Text-to-3D + Image-to-3D",
      "GLB/OBJ/STL export",
      "Custom materials",
      "Print supports"
    ]
  },
  {
    id: "pro",
    title: "Pro",
    desc: "Unlimited models with priority generation, ideal for professionals and competition entries.",
    priceLabel: "$29 / month",
    priceId: "price_1N9Z8y1234567890",
    color: "bg-purple-600",
    cta: "Subscribe",
    disabled: false,
    features: [
      "Unlimited model generations",
      "Priority AI processing",
      "Text-to-3D + Image-to-3D",
      "All export formats",
      "Advanced materials",
      "Print supports + shell thickness",
      "AR/VR preview"
    ]
  }
];

// Component: Hero Section
const HeroSection = () => (
  <motion.section
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 1 }}
    className="relative h-screen flex items-center justify-center bg-black overflow-hidden"
  >
    <video
      autoPlay
      muted
      loop
      className="absolute w-full h-full object-cover opacity-60"
    >
      <source src="https://example.com/3d-model-showcase.mp4" type="video/mp4" />
    </video>
    <div className="relative z-10 text-center px-4">
      <motion.h1
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="text-5xl md:text-7xl font-extrabold tracking-tight"
      >
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-600">
          3D Model Magic
        </span>
      </motion.h1>
      <motion.p
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="mt-4 text-xl md:text-2xl max-w-3xl mx-auto"
      >
        Create stunning, competition-ready 3D models with AI. Perfect for Bambu Lab designs, from intricate mechanics to artistic sculptures.
      </motion.p>
      <motion.button
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        onClick={() => window.scrollTo({ top: document.getElementById("generator").offsetTop, behavior: "smooth" })}
        className="mt-6 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-full transition duration-300"
      >
        Start Creating Now
      </motion.button>
    </div>
  </motion.section>
);

// Component: Header
const Header = ({ user, userPlan, setShowSignUp, setShowSignIn, signOut }) => (
  <header className="sticky top-0 z-50 bg-gray-900 bg-opacity-90 backdrop-blur-sm py-4">
    <div className="container mx-auto px-4 flex justify-between items-center">
      <h2 className="text-2xl font-bold text-yellow-400">3D Model Magic</h2>
      <div className="flex items-center space-x-4">
        {user ? (
          <>
            <span className="text-sm hidden md:block">
              Welcome, <strong>{user.email}</strong> ({userPlan})
            </span>
            <button
              onClick={signOut}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200"
              aria-label="Sign out"
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => { setShowSignUp(true); setShowSignIn(false); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
              aria-label="Sign up"
            >
              Sign Up
            </button>
            <button
              onClick={() => { setShowSignIn(true); setShowSignUp(false); }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200"
              aria-label="Sign in"
            >
              Sign In
            </button>
          </>
        )}
      </div>
    </div>
  </header>
);

// Component: Auth Modal
const AuthModal = ({ show, onClose, onSubmit, title, buttonText, buttonColor }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-gray-800 p-8 rounded-xl w-full max-w-md shadow-2xl"
        >
          <h2 className="text-2xl font-bold mb-4">{title}</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="w-full p-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
              aria-label="Email address"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="w-full p-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
              aria-label="Password"
            />
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                aria-label="Cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`${buttonColor} hover:${buttonColor.replace("bg-", "bg-opacity-80")} text-white px-4 py-2 rounded-lg`}
                aria-label={buttonText}
              >
                {buttonText}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Component: Generator Section
const GeneratorSection = ({
  prompt,
  setPrompt,
  width,
  setWidth,
  height,
  setHeight,
  depth,
  setDepth,
  material,
  setMaterial,
  supports,
  setSupports,
  shellThickness,
  setShellThickness,
  infill,
  setInfill,
  image,
  setImage,
  isLoading,
  modelUrl,
  error,
  generateModel,
  payForModel,
  userPlan
}) => {
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      toast.info('Image uploaded. Will be used for 3D generation.');
    } else {
      toast.error('Please upload a valid image file.');
    }
  };

  return (
    <section id="generator" className="py-16 container mx-auto px-4">
      <motion.h2
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-4xl font-bold text-center mb-8"
      >
        Generate Competition-Ready 3D Models
      </motion.h2>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-5xl mx-auto grid md:grid-cols-2 gap-8"
      >
        {/* Form */}
        <div className="space-y-4">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your model (e.g., 'intricate gearbox for Bambu Lab')"
            className="w-full p-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-yellow-500"
            aria-label="Model description"
          />
          <div className="grid grid-cols-3 gap-3">
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="Width (mm)"
              className={`p-3 rounded-lg text-black focus:outline-none ${!validDimension(width) && width ? "border-2 border-red-500" : "focus:ring-2 focus:ring-yellow-500"}`}
              aria-label="Width in millimeters"
            />
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="Height (mm)"
              className={`p-3 rounded-lg text-black focus:outline-none ${!validDimension(height) && height ? "border-2 border-red-500" : "focus:ring-2 focus:ring-yellow-500"}`}
              aria-label="Height in millimeters"
            />
            <input
              type="number"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              placeholder="Depth (mm)"
              className={`p-3 rounded-lg text-black focus:outline-none ${!validDimension(depth) && depth ? "border-2 border-red-500" : "focus:ring-2 focus:ring-yellow-500"}`}
              aria-label="Depth in millimeters"
            />
          </div>
          <select
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="w-full p-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-yellow-500"
            aria-label="Material type"
          >
            <option value="plastic">Plastic (PLA/ABS)</option>
            <option value="metal">Metal (Aluminum/Steel)</option>
            <option value="resin">Resin (SLA)</option>
            <option value="wood">Wood Composite</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={shellThickness}
              onChange={(e) => setShellThickness(e.target.value)}
              placeholder="Shell Thickness (mm)"
              className={`p-3 rounded-lg text-black focus:outline-none ${!validDimension(shellThickness) && shellThickness ? "border-2 border-red-500" : "focus:ring-2 focus:ring-yellow-500"}`}
              aria-label="Shell thickness in millimeters"
            />
            <select
              value={infill}
              onChange={(e) => setInfill(e.target.value)}
              className="p-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Infill density"
            >
              <option value="10">10% Infill</option>
              <option value="20">20% Infill</option>
              <option value="50">50% Infill</option>
              <option value="100">100% Infill</option>
            </select>
          </div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={supports}
              onChange={(e) => setSupports(e.target.checked)}
              className="h-5 w-5 text-yellow-500"
              aria-label="Add print supports"
            />
            <span>Add Print Supports</span>
          </label>
          <div>
            <button
              onClick={() => fileInputRef.current.click()}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition duration-200"
              aria-label="Upload reference image"
            >
              Upload Reference Image
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            {image && <p className="text-sm text-gray-400 mt-2">Image: {image.name}</p>}
          </div>
          <button
            onClick={generateModel}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Generate 3D model"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Generating...
              </span>
            ) : (
              "Generate Model"
            )}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {modelUrl && (
            <div className="mt-4 space-y-2">
              <p className="text-green-400">Model ready! Preview below.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => payForModel(userPlan === "pro" ? null : "price_1N9Z8z1234567890")}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200"
                  aria-label={userPlan === "pro" ? "Download free" : "Pay and download"}
                >
                  {userPlan === "pro" ? "Download Free" : "Pay & Download"}
                </button>
                <a
                  href={modelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition duration-200"
                  aria-label="Open model in new tab"
                >
                  Open Model
                </a>
              </div>
            </div>
          )}
        </div>
        {/* Preview */}
        <div>
          <div className="bg-black rounded-lg p-4">
            {modelUrl ? (
              <model-viewer
                src={modelUrl}
                alt="Generated 3D model"
                camera-controls
                auto-rotate
                ar
                shadow-intensity="1"
                camera-orbit="45deg 55deg 2m"
                min-camera-orbit="auto 45deg 1m"
                max-camera-orbit="auto 90deg 3m"
                style={{ width: "100%", height: "400px", borderRadius: "8px" }}
              />
            ) : (
              <div className="p-6 text-left text-gray-400">
                <p className="mb-2">Your model preview will appear here.</p>
                <p className="text-sm">
                  Tip: Try "intricate gearbox for Bambu Lab, high-precision interlocking gears"
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 text-left">
            <h4 className="text-xl font-semibold">AI Capabilities</h4>
            <ul className="list-disc ml-5 mt-2 text-sm space-y-1">
              <li>Text-to-3D: Generate complex models from detailed prompts</li>
              <li>Image-to-3D: Convert reference images to 3D models</li>
              <li>High-Precision: Optimized for Bambu Lab tolerances (±0.1mm)</li>
              <li>Custom Materials: Plastic, metal, resin, or wood composite</li>
              <li>Print Supports: Auto-generated for stable printing</li>
              <li>Shell & Infill: Adjustable for strength and weight</li>
              <li>Export Formats: GLB, OBJ, STL for versatility</li>
              <li>AR/VR Ready: Preview in augmented reality</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

// Component: Example Models Gallery
const ExampleModelsSection = ({ setPrompt, setModelUrl }) => (
  <section className="py-16 container mx-auto px-4">
    <motion.h2
      initial={{ y: 50, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="text-4xl font-bold text-center mb-8"
    >
      Explore Competition-Worthy Models
    </motion.h2>
    <div className="grid md:grid-cols-3 gap-6">
      {EXAMPLE_MODELS.map((model) => (
        <motion.div
          key={model.id}
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: model.id * 0.1 }}
          className="bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition duration-300"
        >
          <model-viewer
            src={model.url}
            alt={model.name}
            camera-controls
            auto-rotate
            style={{ width: "100%", height: "200px", borderRadius: "8px" }}
            shadow-intensity="1"
          />
          <h3 className="text-xl font-semibold mt-4">{model.name}</h3>
          <p className="text-sm text-gray-400 mt-2">{model.desc}</p>
          <p className="text-sm text-gray-500 mt-1">Tags: {model.tags.join(", ")}</p>
          <button
            onClick={() => {
              setPrompt(model.name);
              setModelUrl(model.url);
              window.scrollTo({ top: document.getElementById("generator").offsetTop, behavior: "smooth" });
              trackEvent("Gallery", "TryModel", model.name);
            }}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
            aria-label={`Try ${model.name} model`}
          >
            Try This Model
          </button>
        </motion.div>
      ))}
    </div>
  </section>
);

// Component: Subscription Plans
const SubscriptionSection = ({ userPlan, payForModel }) => (
  <section className="py-16 container mx-auto px-4">
    <motion.h2
      initial={{ y: 50, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="text-4xl font-bold text-center mb-8"
    >
      Choose Your Plan
    </motion.h2>
    <div className="grid md:grid-cols-3 gap-6">
      {PLANS.map((plan) => (
        <motion.div
          key={plan.id}
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className={`p-6 rounded-lg shadow-lg bg-gray-800 hover:shadow-xl transition duration-300 ${plan.id === userPlan ? "border-2 border-yellow-400" : ""}`}
        >
          <h3 className="text-2xl font-bold mb-2">{plan.title}</h3>
          <p className="text-gray-300 mb-4">{plan.desc}</p>
          <ul className="list-disc ml-5 mb-4 text-sm text-gray-400">
            {plan.features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xl font-semibold">{plan.priceLabel}</div>
              <div className="text-sm text-gray-400">Billed monthly</div>
            </div>
            <button
              onClick={() => payForModel(plan.priceId)}
              disabled={plan.id === userPlan}
              className={`${plan.color} hover:${plan.color.replace("bg-", "bg-opacity-80")} text-white px-4 py-2 rounded-lg font-semibold transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={plan.id === userPlan ? "Current plan" : plan.cta}
            >
              {plan.id === userPlan ? "Current Plan" : plan.cta}
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  </section>
);

// Component: Stripe Modal
const StripeModal = ({ show, onClose }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-gray-800 p-8 rounded-xl w-full max-w-md shadow-2xl"
        >
          <h3 className="text-xl font-bold mb-4">Payment Processing</h3>
          <p className="text-sm text-gray-300 mb-4">
            You will be redirected to Stripe's secure checkout page to complete your purchase.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
              aria-label="Close payment modal"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Component: Footer
const Footer = () => (
  <footer className="py-12 bg-gray-900 text-center text-gray-400">
    <div className="container mx-auto px-4">
      <p>&copy; {new Date().getFullYear()} 3D Model Magic. All rights reserved.</p>
      <div className="mt-4 space-x-4">
        <a href="/terms" className="hover:text-yellow-400 transition duration-200" aria-label="Terms of Service">
          Terms of Service
        </a>
        <a href="/privacy" className="hover:text-yellow-400 transition duration-200" aria-label="Privacy Policy">
          Privacy Policy
        </a>
        <a href="/contact" className="hover:text-yellow-400 transition duration-200" aria-label="Contact Us">
          Contact Us
        </a>
      </div>
    </div>
  </footer>
);

// Main App Component
function App() {
  // State management
  const [prompt, setPrompt] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [depth, setDepth] = useState("");
  const [material, setMaterial] = useState("plastic");
  const [supports, setSupports] = useState(false);
  const [shellThickness, setShellThickness] = useState("");
  const [infill, setInfill] = useState("20");
  const [image, setImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modelUrl, setModelUrl] = useState(null);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState("free");
  const [showSignUp, setShowSignUp] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);

  // Firebase auth state
  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged((u) => {
      if (u) {
        setUser({ email: u.email, uid: u.uid });
        fetchUserPlan(u.uid).then((plan) => {
          setUserPlan(plan || "free");
          trackEvent("Auth", "SignIn", u.email);
        });
      } else {
        setUser(null);
        setUserPlan("free");
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch user plan from backend
  async function fetchUserPlan(uid) {
    try {
      const resp = await fetch(`/.netlify/functions/get-user-plan?uid=${uid}`, {
        headers: { "X-CSRF-Token": await getCsrfToken() }
      });
      const data = await resp.json();
      return data.plan;
    } catch (err) {
      console.error("Failed to fetch user plan:", err);
      toast.error("Error fetching plan. Defaulting to Free.");
      return "free";
    }
  }

  // CSRF token fetch
  async function getCsrfToken() {
    try {
      const resp = await fetch("/.netlify/functions/get-csrf-token");
      const data = await resp.json();
      return data.token;
    } catch (err) {
      console.error("CSRF token error:", err);
      return "";
    }
  }

  // Generate 3D model
  async function generateModel() {
    setError("");
    const sanitizedPrompt = sanitizeInput(prompt.trim());
    if (!sanitizedPrompt && !image) {
      setError("Please provide a description or upload an image.");
      toast.error("Description or image required.");
      return;
    }
    if (!validDimension(width) || !validDimension(height) || !validDimension(depth)) {
      setError("Enter valid width, height, and depth in millimeters (numbers > 0).");
      toast.error("Invalid dimensions.");
      return;
    }
    if (!validDimension(shellThickness) && shellThickness) {
      setError("Enter valid shell thickness in millimeters (number > 0).");
      toast.error("Invalid shell thickness.");
      return;
    }

    setIsLoading(true);
    setModelUrl(null);
    trackEvent("Model", "GenerateAttempt", sanitizedPrompt || "Image-based");

    try {
      const BACKEND = window.__BACKEND_URL__ || "/.netlify/functions/generate";
      const formData = new FormData();
      formData.append("prompt", sanitizedPrompt);
      formData.append("measurements", JSON.stringify({
        width: Number(width),
        height: Number(height),
        depth: Number(depth)
      }));
      formData.append("material", material);
      formData.append("supports", supports);
      formData.append("shellThickness", Number(shellThickness) || 1);
      formData.append("infill", Number(infill));
      formData.append("userId", user?.uid || null);
      if (image) {
        formData.append("image", image);
      }

      const resp = await fetch(BACKEND, {
        method: "POST",
        headers: { "X-CSRF-Token": await getCsrfToken() },
        body: formData
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        setError("Failed to generate model. Using placeholder preview.");
        toast.error("Backend error. Showing placeholder.");
        setModelUrl("https://modelviewer.dev/shared-assets/models/Astronaut.glb");
        setIsLoading(false);
        return;
      }

      const data = await resp.json();
      if (data?.error) {
        setError(data.error);
        toast.error(data.error);
        setIsLoading(false);
        return;
      }

      if (data?.modelUrl) {
        setModelUrl(data.modelUrl);
        toast.success("Model generated successfully!");
        trackEvent("Model", "GenerateSuccess", sanitizedPrompt || "Image-based");
      } else {
        setError("No model URL returned. Showing placeholder.");
        toast.error("No model URL. Showing placeholder.");
        setModelUrl("https://modelviewer.dev/shared-assets/models/Astronaut.glb");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Using placeholder preview.");
      toast.error("Network error. Check console.");
      setModelUrl("https://modelviewer.dev/shared-assets/models/Astronaut.glb");
    } finally {
      setIsLoading(false);
    }
  }

  // Initiate Stripe checkout
  async function payForModel(priceId) {
    setError("");
    if (!priceId && userPlan !== "pro") {
      setError("This plan is included by default.");
      toast.info("Free plan is active.");
      return;
    }
    if (priceId && !modelUrl) {
      setError("Generate a model first before purchasing.");
      toast.error("Generate a model first.");
      return;
    }
    if (!user) {
      setError("Please sign in to subscribe or purchase.");
      toast.error("Sign in required.");
      setShowSignIn(true);
      return;
    }

    setShowStripeModal(true);
    try {
      const resp = await fetch("/.netlify/functions/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": await getCsrfToken()
        },
        body: JSON.stringify({
          priceId: priceId || "free-download",
          modelUrl: modelUrl || "subscription",
          userId: user.uid
        })
      });

      const data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
        trackEvent("Payment", "CheckoutInitiated", priceId || "free-download");
      } else {
        setError("Failed to initiate checkout.");
        toast.error("Checkout initiation failed.");
      }
    } catch (err) {
      console.error(err);
      setError("Checkout error. Please try again.");
      toast.error("Checkout error.");
    } finally {
      setShowStripeModal(false);
    }
  }

  // Firebase sign-up
  async function handleSignUpSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const email = sanitizeInput(form.get("email"));
    const password = form.get("password");

    try {
      await firebase.auth().createUserWithEmailAndPassword(email, password);
      setShowSignUp(false);
      toast.success("Successfully signed up!");
      trackEvent("Auth", "SignUp", email);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  }

  // Firebase sign-in
  async function handleSignInSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const email = sanitizeInput(form.get("email"));
    const password = form.get("password");

    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);
      setShowSignIn(false);
      toast.success("Successfully signed in!");
      trackEvent("Auth", "SignIn", email);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  }

  // Sign out
  async function signOut() {
    await firebase.auth().signOut();
    setError("Signed out.");
    toast.info("Signed out.");
    trackEvent("Auth", "SignOut", user?.email);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      <Header
        user={user}
        userPlan={userPlan}
        setShowSignUp={setShowSignUp}
        setShowSignIn={setShowSignIn}
        signOut={signOut}
      />
      <HeroSection />
      <GeneratorSection
        prompt={prompt}
        setPrompt={setPrompt}
        width={width}
        setWidth={setWidth}
        height={height}
        setHeight={setHeight}
        depth={depth}
        setDepth={setDepth}
        material={material}
        setMaterial={setMaterial}
        supports={supports}
        setSupports={setSupports}
        shellThickness={shellThickness}
        setShellThickness={setShellThickness}
        infill={infill}
        setInfill={setInfill}
        image={image}
        setImage={setImage}
        isLoading={isLoading}
        modelUrl={modelUrl}
        error={error}
        generateModel={generateModel}
        payForModel={payForModel}
        userPlan={userPlan}
      />
      <ExampleModelsSection setPrompt={setPrompt} setModelUrl={setModelUrl} />
      <SubscriptionSection userPlan={userPlan} payForModel={payForModel} />
      <StripeModal show={showStripeModal} onClose={() => setShowStripeModal(false)} />
      <AuthModal
        show={showSignUp}
        onClose={() => setShowSignUp(false)}
        onSubmit={handleSignUpSubmit}
        title="Sign Up"
        buttonText="Sign Up"
        buttonColor="bg-blue-600"
      />
      <AuthModal
        show={showSignIn}
        onClose={() => setShowSignIn(false)}
        onSubmit={handleSignInSubmit}
        title="Sign In"
        buttonText="Sign In"
        buttonColor="bg-green-600"
      />
      <Footer />
    </div>
  );
}

// Render the app
const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(<App />);
