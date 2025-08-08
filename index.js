import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import firebase from 'firebase/app';
import 'firebase/auth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Firebase config (replace with your Firebase project config)
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Google Analytics (assuming gtag.js included in HTML)
const trackEvent = (category, action, label) => {
  window.gtag('event', action, { event_category: category, event_label: label });
};

/**
 * Helper: Validate numeric dimensions
 */
function validDimension(v) {
  if (!v) return false;
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

/**
 * Sanitize input to prevent XSS
 */
function sanitizeInput(input) {
  return input.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'
  })[m]);
}

/**
 * Example models for gallery (competition-worthy)
 */
const EXAMPLE_MODELS = [
  {
    id: 1,
    name: "Modular Drone Frame",
    url: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
    desc: "Lightweight, interlocking drone chassis with optimized aerodynamics for Bambu Lab printers.",
    tags: ["Drone", "Functional", "Bambu Lab"],
  },
  {
    id: 2,
    name: "Intricate Jewelry Stand",
    url: "https://modelviewer.dev/shared-assets/models/shader-ball.glb",
    desc: "Elegant, tree-like stand with fine details, perfect for high-resolution SLA printing.",
    tags: ["Art", "Decorative", "Bambu Lab"],
  },
  {
    id: 3,
    name: "Robotic Gripper",
    url: "https://modelviewer.dev/shared-assets/models/RobotExpressive.glb",
    desc: "Precision-engineered gripper with moving parts, designed for robotic assemblies.",
    tags: ["Robotics", "Functional", "Bambu Lab"],
  },
  {
    id: 4,
    name: "Architectural Facade",
    url: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
    desc: "Detailed building facade with parametric patterns, ideal for architectural models.",
    tags: ["Architecture", "Parametric", "Bambu Lab"],
  },
];

/**
 * Subscription plans with real Stripe price IDs (replace with actual IDs)
 */
const PLANS = [
  {
    id: "free",
    title: "Free",
    desc: "1 model/month, basic preview, no downloads.",
    priceLabel: "Free",
    priceId: null,
    color: "bg-gray-700",
    cta: "Get Started",
    disabled: false,
  },
  {
    id: "basic",
    title: "Basic",
    desc: "10 models/month, STL/GLB downloads, standard generation speed.",
    priceLabel: "$9 / month",
    priceId: "price_1N9Z8x1234567890",
    color: "bg-yellow-500",
    cta: "Subscribe",
    disabled: false,
  },
  {
    id: "pro",
    title: "Pro",
    desc: "Unlimited models, priority generation, advanced parametric options.",
    priceLabel: "$29 / month",
    priceId: "price_1N9Z8y1234567890",
    color: "bg-purple-600",
    cta: "Subscribe",
    disabled: false,
  },
];

/**
 * Component: Hero Section
 */
function HeroSection({ scrollToGenerator }) {
  return (
    <section className="relative h-screen flex items-center justify-center bg-black overflow-hidden">
      <video autoPlay muted loop className="absolute w-full h-full object-cover opacity-60">
        <source src="https://example.com/3d-model-showcase.mp4" type="video/mp4" />
      </video>
      <div className="relative z-10 text-center px-4">
        <h1 className="text-4xl md:text-6xl lg:text-8xl font-extrabold tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-600">
            3D Model Magic
          </span>
        </h1>
        <p className="mt-4 text-lg md:text-2xl max-w-3xl mx-auto text-gray-200">
          Create award-winning 3D models with AI. Win Bambu Lab competitions with precision, creativity, and ease.
        </p>
        <button
          onClick={scrollToGenerator}
          className="mt-8 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 px-8 rounded-full transition duration-300 transform hover:scale-105"
          aria-label="Start creating 3D models"
        >
          Create Now
        </button>
      </div>
    </section>
  );
}

/**
 * Component: Header
 */
function Header({ user, userPlan, signOut, setShowSignUp, setShowSignIn }) {
  return (
    <header className="sticky top-0 z-50 bg-gray-900 bg-opacity-90 backdrop-blur-sm py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <h2 className="text-2xl md:text-3xl font-bold text-yellow-400">3D Model Magic</h2>
        <nav className="flex items-center space-x-4">
          <a href="#generator" className="text-gray-300 hover:text-yellow-400 transition duration-200">Generator</a>
          <a href="#gallery" className="text-gray-300 hover:text-yellow-400 transition duration-200">Gallery</a>
          <a href="#plans" className="text-gray-300 hover:text-yellow-400 transition duration-200">Plans</a>
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">
                <strong>{user.email}</strong> ({userPlan})
              </span>
              <button
                onClick={signOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200"
                aria-label="Sign out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex space-x-4">
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
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

/**
 * Component: Auth Modal
 */
function AuthModal({ type, onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold mb-4">{type === 'signup' ? 'Sign Up' : 'Sign In'}</h2>
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
              className={`bg-${type === 'signup' ? 'blue' : 'green'}-600 hover:bg-${type === 'signup' ? 'blue' : 'green'}-700 text-white px-4 py-2 rounded-lg`}
              aria-label={type === 'signup' ? 'Sign up' : 'Sign in'}
            >
              {type === 'signup' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Component: Generator Section
 */
function GeneratorSection({ generateModel, modelUrl, error, isLoading, userPlan }) {
  const [prompt, setPrompt] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [depth, setDepth] = useState("");
  const [material, setMaterial] = useState("plastic");
  const [supports, setSupports] = useState(false);
  const [infill, setInfill] = useState(20);
  const [shellThickness, setShellThickness] = useState(1.2);
  const [image, setImage] = useState(null);

  const handleGenerate = () => {
    generateModel({
      prompt,
      width,
      height,
      depth,
      material,
      supports,
      infill,
      shellThickness,
      image,
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result);
      reader.readAsDataURL(file);
      trackEvent("Generator", "ImageUpload", file.name);
    }
  };

  return (
    <section id="generator" className="py-16 container mx-auto px-4">
      <h2 className="text-4xl md:text-5xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-600">
        Create Competition-Winning 3D Models
      </h2>
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
        {/* Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="prompt">Model Description</label>
            <input
              id="prompt"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'modular drone frame with aerodynamic curves'"
              className="w-full p-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Model description"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="width">Width (mm)</label>
              <input
                id="width"
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="Width"
                className={`w-full p-3 rounded-lg text-black focus:outline-none ${!validDimension(width) && width ? "border-2 border-red-500" : "focus:ring-2 focus:ring-yellow-500"}`}
                aria-label="Width in millimeters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="height">Height (mm)</label>
              <input
                id="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="Height"
                className={`w-full p-3 rounded-lg text-black focus:outline-none ${!validDimension(height) && height ? "border-2 border-red-500" : "focus:ring-2 focus:ring-yellow-500"}`}
                aria-label="Height in millimeters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="depth">Depth (mm)</label>
              <input
                id="depth"
                type="number"
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                placeholder="Depth"
                className={`w-full p-3 rounded-lg text-black focus:outline-none ${!validDimension(depth) && depth ? "border-2 border-red-500" : "focus:ring-2 focus:ring-yellow-500"}`}
                aria-label="Depth in millimeters"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="material">Material</label>
            <select
              id="material"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="w-full p-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Material type"
            >
              <option value="plastic">Plastic (PLA/ABS)</option>
              <option value="metal">Metal (Stainless Steel)</option>
              <option value="wood">Wood (MDF)</option>
              <option value="ceramic">Ceramic</option>
              <option value="resin">Resin (SLA)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="infill">Infill (%)</label>
            <input
              id="infill"
              type="number"
              value={infill}
              onChange={(e) => setInfill(Math.max(0, Math.min(100, e.target.value)))}
              placeholder="Infill"
              className="w-full p-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Infill percentage"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="shellThickness">Shell Thickness (mm)</label>
            <input
              id="shellThickness"
              type="number"
              value={shellThickness}
              onChange={(e) => setShellThickness(Math.max(0.4, e.target.value))}
              placeholder="Shell Thickness"
              className="w-full p-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Shell thickness in millimeters"
            />
          </div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={supports}
              onChange={(e) => setSupports(e.target.checked)}
              className="h-5 w-5 text-yellow-500 focus:ring-yellow-500"
              aria-label="Add print supports"
            />
            <span>Add Print Supports</span>
          </label>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="image">Upload Reference Image (Optional)</label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full p-3 rounded-lg text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:bg-yellow-500 file:text-black file:font-semibold file:border-0 hover:file:bg-yellow-600"
              aria-label="Upload reference image"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-semibold transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  onClick={() => generateModel({ download: true })}
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
                style={{ width: "100%", height: "500px", borderRadius: "8px" }}
                loading="lazy"
              />
            ) : (
              <div className="p-6 text-left text-gray-400">
                <p className="mb-2">Your model preview will appear here.</p>
                <p className="text-sm">Tip: Try "modular drone frame with aerodynamic curves, optimized for Bambu Lab X1 Carbon"</p>
              </div>
            )}
          </div>
          <div className="mt-4 text-left">
            <h4 className="text-xl font-semibold">AI Capabilities</h4>
            <ul className="list-disc ml-5 mt-2 text-sm space-y-1">
              <li>Text-to-3D: Generate precise, print-ready models from detailed prompts</li>
              <li>Image-to-3D: Convert reference images to 3D models (Pro plan)</li>
              <li>Parametric Design: Customize material, infill, and shell thickness</li>
              <li>Print Supports: Auto-generated supports for Bambu Lab compatibility</li>
              <li>Export Formats: GLB, OBJ, STL for versatile use</li>
              <li>AR/VR Ready: Preview in augmented reality with WebXR</li>
              <li>Competition Optimized: High-resolution, complex geometries for Bambu Lab contests</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Component: Gallery Section
 */
function GallerySection({ setPrompt, setModelUrl }) {
  return (
    <section id="gallery" className="py-16 container mx-auto px-4">
      <h2 className="text-4xl md:text-5xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-600">
        Explore Competition-Winning Designs
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {EXAMPLE_MODELS.map((model) => (
          <div key={model.id} className="bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition duration-300">
            <model-viewer
              src={model.url}
              alt={model.name}
              camera-controls
              auto-rotate
              style={{ width: "100%", height: "250px", borderRadius: "8px" }}
              shadow-intensity="1"
              loading="lazy"
            />
            <h3 className="text-xl font-semibold mt-4">{model.name}</h3>
            <p className="text-sm text-gray-400 mt-2">{model.desc}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {model.tags.map((tag) => (
                <span key={tag} className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">{tag}</span>
              ))}
            </div>
            <button
              onClick={() => {
                setPrompt(model.name);
                setModelUrl(model.url);
                window.scrollTo({ top: document.getElementById("generator").offsetTop, behavior: "smooth" });
                trackEvent("Gallery", "TryModel", model.name);
              }}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 w-full"
              aria-label={`Try ${model.name}`}
            >
              Try This Model
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Component: Plans Section
 */
function PlansSection({ payForModel, userPlan }) {
  return (
    <section id="plans" className="py-16 container mx-auto px-4">
      <h2 className="text-4xl md:text-5xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-600">
        Choose Your Plan
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`p-6 rounded-lg shadow-lg bg-gray-800 hover:shadow-xl transition duration-300 ${plan.id === userPlan ? "border-4 border-yellow-400" : ""}`}
          >
            <h3 className="text-2xl font-bold mb-2">{plan.title}</h3>
            <p className="text-gray-300 mb-4">{plan.desc}</p>
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
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Main App Component
 */
function App() {
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState("free");
  const [modelUrl, setModelUrl] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const generatorRef = useRef(null);

  // Firebase auth state
  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged(async (u) => {
      if (u) {
        setUser({ email: u.email, uid: u.uid });
        const plan = await fetchUserPlan(u.uid);
        setUserPlan(plan || "free");
        trackEvent("Auth", "SignIn", u.email);
      } else {
        setUser(null);
        setUserPlan("free");
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch user plan
  async function fetchUserPlan(uid) {
    try {
      const resp = await fetch(`/.netlify/functions/get-user-plan?uid=${uid}`, {
        headers: { "X-CSRF-Token": await getCsrfToken() }
      });
      const data = await resp.json();
      return data.plan;
    } catch (err) {
      console.error("Failed to fetch user plan:", err);
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
      console.error("CSRF token fetch failed:", err);
      return "";
    }
  }

  // Generate model
  async function generateModel({ prompt, width, height, depth, material, supports, infill, shellThickness, image, download = false }) {
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
    if (infill < 0 || infill > 100) {
      setError("Infill must be between 0 and 100%.");
      toast.error("Invalid infill percentage.");
      return;
    }
    if (shellThickness < 0.4) {
      setError("Shell thickness must be at least 0.4mm.");
      toast.error("Invalid shell thickness.");
      return;
    }

    setIsLoading(true);
    setModelUrl(null);
    trackEvent("Generator", "GenerateAttempt", sanitizedPrompt || "image-based");

    try {
      const BACKEND = window.__BACKEND_URL__ || "/.netlify/functions/generate";
      const payload = {
        prompt: sanitizedPrompt,
        measurements: { width: Number(width), height: Number(height), depth: Number(depth) },
        material,
        supports,
        infill: Number(infill),
        shellThickness: Number(shellThickness),
        image,
        userId: user?.uid || null,
        format: download ? "stl" : "glb", // STL for downloads, GLB for previews
      };

      const resp = await fetch(BACKEND, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": await getCsrfToken()
        },
        body: JSON.stringify(payload),
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
        toast.success(download ? "Model downloaded!" : "Model generated!");
        trackEvent("Generator", download ? "DownloadSuccess" : "GenerateSuccess", sanitizedPrompt || "image-based");
        if (download && userPlan !== "pro") {
          await payForModel("price_1N9Z8z1234567890"); // One-time purchase
        }
      } else {
        setError("No model URL returned. Showing placeholder.");
        toast.error("No model URL. Showing placeholder.");
        setModelUrl("https://modelviewer.dev/shared-assets/models/Astronaut.glb");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Using placeholder preview.");
      toast.error("Network error.");
      setModelUrl("https://modelviewer.dev/shared-assets/models/Astronaut.glb");
    } finally {
      setIsLoading(false);
    }
  }

  // Initiate Stripe checkout
  async function payForModel(priceId) {
    setError("");
    if (!priceId) {
      setError("This plan is included by default.");
      toast.info("Free plan active.");
      return;
    }
    if (priceId.startsWith("price_") && !modelUrl && !priceId.includes("sub")) {
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
          priceId,
          modelUrl: modelUrl || "subscription",
          userId: user.uid,
        }),
      });

      const data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
        trackEvent("Payment", "CheckoutInitiated", priceId);
      } else {
        setError("Failed to initiate checkout.");
        toast.error("Checkout initiation failed.");
        setShowStripeModal(false);
      }
    } catch (err) {
      console.error(err);
      setError("Checkout error. Please try again.");
      toast.error("Checkout error.");
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

  // Scroll to generator
  const scrollToGenerator = () => {
    window.scrollTo({ top: generatorRef.current.offsetTop, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick draggable pauseOnHover theme="dark" />
      <HeroSection scrollToGenerator={scrollToGenerator} />
      <Header
        user={user}
        userPlan={userPlan}
        signOut={signOut}
        setShowSignUp={setShowSignUp}
        setShowSignIn={setShowSignIn}
      />
      {showSignUp && (
        <AuthModal
          type="signup"
          onClose={() => setShowSignUp(false)}
          onSubmit={handleSignUpSubmit}
        />
      )}
      {showSignIn && (
        <AuthModal
          type="signin"
          onClose={() => setShowSignIn(false)}
          onSubmit={handleSignInSubmit}
        />
      )}
      <div ref={generatorRef}>
        <GeneratorSection
          generateModel={generateModel}
          modelUrl={modelUrl}
          error={error}
          isLoading={isLoading}
          userPlan={userPlan}
        />
      </div>
      <GallerySection setPrompt={(p) => generateModel({ prompt: p })} setModelUrl={setModelUrl} />
      <PlansSection payForModel={payForModel} userPlan={userPlan} />
      {showStripeModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Payment Processing</h3>
            <p className="text-sm text-gray-300 mb-4">
              Redirecting to Stripe's secure checkout page...
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowStripeModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                aria-label="Close payment modal"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <footer className="py-12 bg-gray-900 text-center text-gray-400">
        <div className="container mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} 3D Model Magic. All rights reserved.</p>
          <div className="mt-4 space-x-4">
            <a href="/terms" className="hover:text-yellow-400 transition duration-200">Terms of Service</a>
            <a href="/privacy" className="hover:text-yellow-400 transition duration-200">Privacy Policy</a>
            <a href="/contact" className="hover:text-yellow-400 transition duration-200">Contact Us</a>
            <a href="https://bambulab.com" className="hover:text-yellow-400 transition duration-200">Bambu Lab</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
