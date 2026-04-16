# 🌍 Fashion City: Open World Roadmap

This document outlines the conceptual roadmap for transitioning the current menu-driven Fashion Game into an immersive, **open world 2D RPG**. It also covers the heavily requested "Character Sprite 2.0" rework to ensure the character models are pristine and ready for multidirectional movement.

This transition will be split into manageable programming "chunks" so we can build them step-by-step.

---

## 🎨 Chunk 1: Character Sprite Rework 2.0
*Before we can have an open world avatar, the avatar itself needs to be flawless.*
**Goal:** Fix remaining hair artifacts, clean up body proportions, and generate multi-directional views.

*   **Flawless Rendering:** completely rewrite the canvas drawing logic using proper layered composite operations so the hair never clips over the face or forms weird "visors" or blocky "slop". 
*   **Vector Art Structure:** Convert the character parts to pure vector paths with anti-aliasing to make lines look sharp and professional.
*   **Directional Sprites:** Currently, the character only faces forward. We will need to design the code to draw the character from the **Front, Back, Left, and Right** profiles so they can walk around the map.
*   **Walking Animation:** Implement a 2D skeletal animation toggle (a basic "bobbing" or leg shifting mechanic) to simulate walking without requiring 100 different image frames.

---

## 🗺️ Chunk 2: Top-Down World Engine & Player Movement
*Converting the menu system into a physical map.*
**Goal:** Create "Fashion City," a 2D open map where the player controls their custom avatar using keyboard arrows or clicks.

*   **Camera & Canvas Engine:** Create a new `js/world.js` engine that renders a large background map and keeps the camera centered on the player.
*   **Movement Logic:** Implement basic WASD/Arrow Key movement.
*   **Environment Design:** Draw the base layer of the city: pink sidewalks, striped crosswalks, park trees, and street lamps to fit the aesthetic.
*   **Collision System:** Ensure the player cannot walk through walls or map boundaries.

---

## 🏢 Chunk 3: Physical Buildings & Interior Transitions
*Placing our existing features into the world.*
**Goal:** Take the existing "Workshop" menus and turn them into actual stores the player must physically walk to.

*   **The Fashion Studio:** A large boutique building. Walking through its front doors loads the existing Dress/Pants creation UI.
*   **The Hair Salon:** A chic glass-front salon. Walking inside triggers the existing Hair/Makeup UI.
*   **The Tech Shop & Bookstore:** Specialized venues scattered around the map.
*   **The Player's Apartment:** A central hub building where the player's saved game starts.
*   **Doorway Transitions:** Create a fade-to-black transition when stepping on a "door" tile to switch from open-world walking into the specific mini-games.

---

## 👗 Chunk 4: Economy & Inventory Ecosystem
*Giving the player a reason to explore and earn.*
**Goal:** Expand the current XP/Coin system into a living economy.

*   **The Mall (Material Shop):** A new building where players must use their earned Coins to buy special fabrics, dyes, and stickers (meaning you no longer start with everything unlocked).
*   **Physical Closet:** Instead of a menu button, the player must walk to their Apartment wardrobe to change their current outfit to clothes they've designed.
*   **Earning Money:** Adding physical registers in your own boutique where NPC customers walk in and purchase the clothes/books/tech you designed.

---

## 💬 Chunk 5: NPCs & Fashion Quests
*Making the city feel alive.*
**Goal:** Populate the open world with other character sprites.

*   **Wandering Fashionistas:** Automatically generate random chibi characters that walk around the city pavements.
*   **Dialogue System:** Walking up to an NPC and pressing 'Space' opens a speech bubble or dialogue box.
*   **"Style Me!" Quests:** Some NPCs will have an exclamation mark (❗) over their heads. Talking to them starts a challenge (e.g., *"I need a blue polka dot dress for a party, can you make one?"*). Returning to them with the requested item rewards massive XP and Coins.
*   **Rivals:** Adding a main "Rival" fashion designer NPC who challenges you to Weekly Fashion Shows (scored minigames).

---

## 🛋️ Chunk 6: Apartment Customization
*Integrating the "Home Decor" studio.*
**Goal:** Make the player's physical apartment customizable.

*   **Grid Placement System:** Allow the player to enter a "decorate mode" inside their apartment.
*   **Placing Items:** The rugs, pillows, and blankets created in the Home Decor studio can be dropped onto the floor and dragged around the apartment.
*   **Expansions:** Buying room expansions for the apartment with high amounts of coins.

---

### **How to Proceed from Here**
When we are ready to begin, we simply say: *"Let's start Chunk 1: Character Sprite Rework"* and focus strictly on rebuilding the drawing commands until the avatar looks perfectly polished from all angles. Then we will move to mapping the actual grid city!
