import { useEffect, useMemo, useState } from "react";
import "./App.css";
import TrophyRoad from "./components/TrophyRoad/TrophyRoad";

const AVATARS = [
  {
    id: "bear",
    name: "Bear",
    sprites: {
  normal: {
    front: "/assets/avatars/bear_front.png",
    back: "/assets/avatars/bear_back.png",
  },
  hat: {
    front: "/assets/avatars/hat/HATbear_front.png",
    back: "/assets/avatars/hat/HATbear_back.png",
  }
}
  },
  {
    id: "cat",
    name: "Cat",
    sprites: {
  normal: {
    front: "/assets/avatars/cat_front.png",
    back: "/assets/avatars/cat_back.png",
  },
  hat: {
    front: "/assets/avatars/hat/HATcat_front.png",
    back: "/assets/avatars/hat/HATcat_back.png",
  }
}
  },
  {
    id: "shark",
    name: "Shark",
    sprites: {
  normal: {
    front: "/assets/avatars/shark_front.png",
    back: "/assets/avatars/shark_back.png",
  },
  hat: {
    front: "/assets/avatars/hat/HATshark_front.png",
    back: "/assets/avatars/hat/HATshark_back.png",
  }
}
  },
];

const ART = {
  logo: "/assets/ui/mataquestLOGO.png",
  avatars: {
    bear: null,
    cat: null,
    shark: null,
  },
  arenas: {
    starter: "assets/arenas/arena1.png",
    midterm: null,
    finals: null,
  },
  rewards: {
    starterChest: "/assets/rewards/starterchest.png",
    UncommonChest: "/assets/rewards/uncommonchest.png",
    studyBoost: "/assets/rewards/studyboost.png",
    rareChest: "/assets/rewards/rarechest.png",
    focusBadge: "/assets/rewards/profilebadge.png",
    finalsChest: "/assets/rewards/finalschest.png",
    coin: "/assets/rewards/coin.png",
  },
  cosmetics: {
    hat: "/assets/cosmetics/HAT.png",
  },
};

const arenas = [
  {
    id: "starter",
    name: "Starter Season",
    subtitle: "Build Foundations",
    range: "0–999",
    min: 0,
    max: 999,
    theme: "forest",
    art: ART.arenas.starter,
  },
  {
    id: "midterm",
    name: "Midterm Season",
    subtitle: "Prove Discipline",
    range: "1,000–1,999",
    min: 1000,
    max: 1999,
    theme: "ice",
    art: ART.arenas.midterm,
  },
  {
    id: "finals",
    name: "Finals Season",
    subtitle: "Achieve Greatness",
    range: "2,000+",
    min: 2000,
    max: Infinity,
    theme: "void",
    art: ART.arenas.finals,
  },
];

const roadRewards = [
 {
  id: "starter-chest",
  threshold: 250,
  arena: "starter",
  type: "chest",
  title: "Starter Chest",
  description: "A common chest containing random rewards.",
  reward: {
  coins: 100,
  xp: 25,
},
  art: ART.rewards.starterChest,
},
  {
    id: "focus badge",
    threshold: 500,
    arena: "starter",
    type: "badge",
    title: "Focus Badge",
    description: "A profile badge for staying consistent.",
    reward: { badge: "Focus Badge" },
    art: ART.rewards.focusBadge,
  },
  {
    id: "study boost",
    threshold: 800,
    arena: "starter",
    type: "boost",
    title: "Study Boost",
    description: "Adds 50 XP as a single one time use progression boost.",
    reward: { xp: 50 },
    art: ART.rewards.studyBoost,
  },
  {
    id: "uncommon chest",
    threshold: 1000,
    arena: "midterm",
    type: "chest",
    title: "Uncommon Chest",
    description: "An uncommon chest for reaching midterm season.",
    reward: {
  coins: 100,
  xp: 25,
},
  art: ART.rewards.UncommonChest,
  },
  
  {
    id: "rare chest",
    threshold: 1500,
    arena: "midterm",
    type: "chest",
    title: "Rare Chest",
    description: "A premium trophy reward.",
     reward: {
  coins: 100,
  xp: 25,
},
  art: ART.rewards.rareChest,
  },

  {
    id: "finals chest",
    threshold: 2500,
    arena: "finals",
    type: "chest",
    title: "Finals Chest",
    description: "A milestone chest for reaching the final academic arena.",
     reward: {
  coins: 100,
  xp: 25,
},
  art: ART.rewards.finalsChest,
  },
];

const shopItems = [
  {
    id: "hat",
    name: "Hat",
    category: "hat",
    rarity: "Rare",
    icon: "",
    cost: 350,
    art: ART.cosmetics.hat,
  },
];

const TROPHY_POINTS = {
  bronze: 10,
  silver: 20,
  gold: 30,
};

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [quests, setQuests] = useState([]);
  const [questsLoading, setQuestsLoading] = useState(true);
  const [questsError, setQuestsError] = useState("");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");

  const [authForm, setAuthForm] = useState({
  username: "",
  password: "",
  displayName: "",
});
  const [playerXP, setPlayerXP] = useState(450);
  const [trophies, setTrophies] = useState(875);
  const [coins, setCoins] = useState(999999);
  const [selectedAvatarId, setSelectedAvatarId] = useState("bear");
  const [equippedCosmetics, setEquippedCosmetics] = useState({
    accessory: null,
    hat: null,
    outfit: null,
    theme: null,
  });
  const selectedAvatar = AVATARS.find((avatar) => avatar.id === selectedAvatarId) ?? AVATARS[0];
  const selectedAvatarImage =
  equippedCosmetics.hat === "hat"
    ? selectedAvatar.sprites.hat.front
    : selectedAvatar.sprites.normal.front;
  const [ownedCosmetics, setOwnedCosmetics] = useState([]);
  const [openingReward, setOpeningReward] = useState(null);
  const [isChestOpening, setIsChestOpening] = useState(false);
  const [revealedContents, setRevealedContents] = useState(null);

  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [courses, setCourses] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState({
    courseId: "",
    name: "",
    points_possible: "",
    due_at: "",
    has_submitted_submissions: false,
    submission_grade: "",
    submitted_at: "",
  });

  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");

    async function handleAuth(event) {
  event.preventDefault();

  try {
    setAuthError("");

    const endpoint =
      authMode === "login"
        ? "/auth/login"
        : "/auth/register";

    const body =
      authMode === "login"
        ? {
            username: authForm.username,
            password: authForm.password,
          }
        : {
            username: authForm.username,
            password: authForm.password,
            displayName: authForm.displayName,
          };

    const response = await fetch(
      `http://localhost:3001${endpoint}`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ?? "Authentication failed."
      );
    }

    setUser(data.user);

    setAuthForm({
      username: "",
      password: "",
      displayName: "",
    });

  } catch (error) {
    console.error(error);
    setAuthError(error.message);
  }
}

async function logout() {
  try {
    await fetch(
      "http://localhost:3001/auth/logout",
      {
        method: "POST",
        credentials: "include",
      }
    );
  } finally {
    setUser(null);
    setActiveTab("home");
  }
}



  async function loadQuests() {
  try {
    setQuestsLoading(true);
    setQuestsError("");

    const response = await fetch(
  "http://localhost:3001/api/v1/courses/101/assignments",
  {
    credentials: "include",
  }
);

    if (!response.ok) {
      throw new Error(
        `Request failed with status ${response.status}`
      );
    }

    const assignments = await response.json();

    const formattedQuests = assignments.map((assignment) => ({
      id: assignment.id,
      courseId: 101,

      title:
        assignment.name ??
        assignment.title ??
        "Untitled Assignment",

      course: "COMP 380",
      due: assignment.due_at ?? "No due date",

      xp: assignment.points_possible ?? 0,

      completed: false,
    }));

    setQuests(formattedQuests);
  } catch (error) {
    console.error("Failed to load quests:", error);
    setQuestsError(
      "Could not load quests from the backend."
    );
  } finally {
    setQuestsLoading(false);
  }
}

async function addAssignment(event) {
  event.preventDefault();

  try {
    setAssignmentSaving(true);
    setAssignmentError("");

    const response = await fetch(
      "http://localhost:3001/api/assignments",
      {
  method: "POST",

  headers: {
    "Content-Type": "application/json",
  },

  credentials: "include",

  body: JSON.stringify(assignmentForm),
}
    );

    const data = await response.json();

    if (!response.ok) {
      const message =
        data.details?.join(", ") ??
        data.error ??
        "Could not add assignment.";

      throw new Error(message);
    }

    setShowAddAssignment(false);

    setAssignmentForm({
      courseId:
        courses.length > 0
          ? String(courses[0].id)
          : "",
      name: "",
      points_possible: "",
      due_at: "",
      has_submitted_submissions: false,
      submission_grade: "",
      submitted_at: "",
    });

    await loadQuests();
  } catch (error) {
    console.error(error);
    setAssignmentError(error.message);
  } finally {
    setAssignmentSaving(false);
  }
}
    useEffect(() => {
  async function checkAuth() {
    try {
      const response = await fetch(
        "http://localhost:3001/api/user/me",
        {
          credentials: "include",
        }
      );

      if (response.status === 401) {
        setUser(null);
        return;
      }

      if (!response.ok) {
        throw new Error("Could not check login.");
      }

      const data = await response.json();

      setUser(data.user);
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }

  checkAuth();
}, []);

    useEffect(() => {
  if (!user) return;

  async function loadPlayerProgress() {
    try {
      const response = await fetch(
        "http://localhost:3001/api/user/progress",
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Could not load player progress."
        );
      }

      const data = await response.json();

      setPlayerXP(data.totalXP);

    } catch (error) {
      console.error(
        "Failed to load player progress:",
        error
      );
    }
  }

  loadPlayerProgress();
}, [user]);


    useEffect(() => {
  if (!user) return;

  loadQuests();
}, [user]);

  const [claimedRewards, setClaimedRewards] = useState([]);
  const [badges, setBadges] = useState([]);
  const [toast, setToast] = useState("");
  const xpPerLevel = 500;
  const level = Math.floor(playerXP / xpPerLevel) + 1;
  const currentLevelXP = playerXP % xpPerLevel;
  const xpPercent = Math.min((currentLevelXP / xpPerLevel) * 100, 100);

  const currentArena = useMemo(
    () => arenas.find((arena) => trophies >= arena.min && trophies <= arena.max) ?? arenas[0],
    [trophies]
  );

  async function loadCourses() {
  try {
    const response = await fetch(
  "http://localhost:3001/api/v1/courses",
  {
    credentials: "include",
  }
);

    if (!response.ok) {
      throw new Error("Could not load courses.");
    }

    const data = await response.json();

    setCourses(data);

    if (data.length > 0) {
      setAssignmentForm((current) => ({
        ...current,
        courseId: String(data[0].id),
      }));
    }
  } catch (error) {
    console.error(error);
    setAssignmentError("Could not load courses.");
  }
}

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(""), 2600);
  }

 async function completeQuest(questId) {
  const selectedQuest =
    quests.find((quest) => quest.id === questId);

  if (!selectedQuest || selectedQuest.completed) {
    return;
  }

 try {
  const response = await fetch(
    "http://localhost:3001/api/xp/award",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify({
        courseId: selectedQuest.courseId,
        assignmentId: selectedQuest.id,
      }),
    }
  );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ?? "Could not complete quest."
      );
    }

    const trophyTier =
      data.awarded.trophy?.toLowerCase();

    const trophyPoints =
      TROPHY_POINTS[trophyTier] ?? 0;

    setQuests((currentQuests) =>
      currentQuests.map((quest) =>
        quest.id === questId
          ? { ...quest, completed: true }
          : quest
      )
    );

    // Xavier's backend is the source of truth for XP
    setPlayerXP(data.totalXP);

    // Frontend converts Bronze/Silver/Gold
    // into Trophy Road progression points
    setTrophies(
      (current) => current + trophyPoints
    );

    showToast(
      `Quest complete: +${data.awarded.xp} XP, +${trophyPoints} trophies`
    );

  } catch (error) {
    console.error(
      "Failed to complete quest:",
      error
    );
  }
}

 function buyCosmetic(item) {
  if (ownedCosmetics.includes(item.id)) return;

  if (coins < item.cost) {
    showToast("You need more coins for this item.");
    return;
  }

  setCoins((current) => current - item.cost);

  setOwnedCosmetics((current) => [
    ...current,
    item.id,
  ]);
}

  function equipCosmetic(item) {
  if (!ownedCosmetics.includes(item.id)) return;

  setEquippedCosmetics((current) => ({
    ...current,
    [item.category]: item.id
  }));
}

  function unequipCosmetic(category) {
  setEquippedCosmetics((current) => ({
    ...current,
    [category]: null,
  }));
}

  function claimRoadReward(reward) {
  if (
    trophies < reward.threshold ||
    claimedRewards.includes(reward.id)
  ) {
    return;
  }

  setClaimedRewards((current) => [...current, reward.id]);

  if (reward.type === "chest") {
  setOpeningReward(reward);
  setRevealedContents(null);
  setIsChestOpening(false);
  return;
}

  applyImmediateReward(reward);
}

function startChestOpening() {
  if (!openingReward || isChestOpening || revealedContents) return;

  setIsChestOpening(true);

  window.setTimeout(() => {
    revealRoadReward();
    setIsChestOpening(false);
  }, 1200);
}

function revealRoadReward() {
  if (!openingReward) return;

  const contents = openingReward.reward;

  if (contents.coins) {
    setCoins((current) => current + contents.coins);
  }

  if (contents.trophies) {
    setTrophies((current) => current + contents.trophies);
  }

  if (contents.xp) {
    setPlayerXP((current) => current + contents.xp);
  }

  if (contents.cosmeticId) {
    setOwnedCosmetics((current) =>
      current.includes(contents.cosmeticId)
        ? current
        : [...current, contents.cosmeticId]
    );
  }

  if (contents.badge) {
    setBadges((current) =>
      current.includes(contents.badge)
        ? current
        : [...current, contents.badge]
    );
  }

  setRevealedContents(contents);
}

    if (authLoading) {
  return (
    <div className="auth-loading">
      Loading MataQUEST...
    </div>
  );
}

if (!user) {
  return (
    <AuthScreen
      mode={authMode}
      setMode={setAuthMode}
      form={authForm}
      setForm={setAuthForm}
      error={authError}
      onSubmit={handleAuth}
    />
  );
}


  return (
          <div className="app-shell">
            {showAddAssignment && (
  <div className="assignment-modal-overlay">

    <form
      className="assignment-modal"
      onSubmit={addAssignment}
    >
      <div className="assignment-modal-header">
        <div>
          <span>QUEST LOG</span>
          <h2>Add Assignment</h2>
        </div>

        <button
          type="button"
          className="assignment-modal-close"
          onClick={() =>
            setShowAddAssignment(false)
          }
        >
          ✕
        </button>
      </div>


      <label>
        Course

        <select
          value={assignmentForm.courseId}
          onChange={(event) =>
            setAssignmentForm(
              (current) => ({
                ...current,
                courseId:
                  event.target.value,
              })
            )
          }
          required
        >
          {courses.map((course) => (
            <option
              key={course.id}
              value={course.id}
            >
              {course.name}
            </option>
          ))}
        </select>
      </label>


      <label>
        Assignment Name

        <input
          type="text"
          value={assignmentForm.name}
          onChange={(event) =>
            setAssignmentForm(
              (current) => ({
                ...current,
                name:
                  event.target.value,
              })
            )
          }
          placeholder="Sprint 2 Report"
          required
        />
      </label>


      <label>
        Points Possible

        <input
          type="number"
          min="0"
          step="1"
          value={
            assignmentForm.points_possible
          }
          onChange={(event) =>
            setAssignmentForm(
              (current) => ({
                ...current,
                points_possible:
                  event.target.value,
              })
            )
          }
          required
        />
      </label>


      <label>
        Due Date

        <input
          type="date"
          value={
            assignmentForm.due_at
          }
          onChange={(event) =>
            setAssignmentForm(
              (current) => ({
                ...current,
                due_at:
                  event.target.value,
              })
            )
          }
        />
      </label>


      <label className="assignment-checkbox">
        <input
          type="checkbox"
          checked={
            assignmentForm.has_submitted_submissions
          }
          onChange={(event) =>
            setAssignmentForm(
              (current) => ({
                ...current,
                has_submitted_submissions:
                  event.target.checked,
              })
            )
          }
        />

        Already submitted?
      </label>


      {assignmentForm.has_submitted_submissions && (
        <div className="assignment-submission-fields">

          <label>
            Grade

            <input
              type="number"
              min="0"
              step="1"
              value={
                assignmentForm.submission_grade
              }
              onChange={(event) =>
                setAssignmentForm(
                  (current) => ({
                    ...current,
                    submission_grade:
                      event.target.value,
                  })
                )
              }
            />
          </label>


          <label>
            Submitted On

            <input
              type="date"
              value={
                assignmentForm.submitted_at
              }
              onChange={(event) =>
                setAssignmentForm(
                  (current) => ({
                    ...current,
                    submitted_at:
                      event.target.value,
                  })
                )
              }
            />
          </label>

        </div>
      )}


      {assignmentError && (
        <p className="assignment-modal-error">
          {assignmentError}
        </p>
      )}


      <div className="assignment-modal-actions">
        <button
          type="button"
          className="assignment-cancel-button"
          onClick={() =>
            setShowAddAssignment(false)
          }
        >
          CANCEL
        </button>

        <button
          type="submit"
          className="assignment-save-button"
          disabled={assignmentSaving}
        >
          {assignmentSaving
            ? "SAVING..."
            : "ADD ASSIGNMENT"}
        </button>
      </div>

    </form>

  </div>
)}
      {toast && <div className="toast" role="status">{toast}</div>}
      
{openingReward && (
  <RewardReveal
    reward={openingReward}
    revealedContents={revealedContents}
    isChestOpening={isChestOpening}
    onOpen={startChestOpening}
    onClose={() => {
      setOpeningReward(null);
      setRevealedContents(null);
      setIsChestOpening(false);
    }}
  />
)}



      {activeTab === "home" && (
  <header className="game-header">
  <div className="brand-block">
    <img
      src={ART.logo}
      alt="MataQUEST"
      className="mataquest-logo"
    />
  </div>

  <div className="resource-bar">
    <div className="resource-pill">
      <span className="resource-icon">🏆</span>
      <strong>{trophies}</strong>
    </div>

    <div className="resource-pill resource-pill-coins">
  <img
    src="/assets/rewards/coin.png"
    alt="Coins"
    className="resource-edge-icon"
  />

  <strong>{coins}</strong>
</div>
  </div>
</header>
      )}
      <main>
        {activeTab === "home" && (
          <HomeScreen
          displayName={user.displayName}
          level={level}
          currentLevelXP={currentLevelXP}
          xpPerLevel={xpPerLevel}
          xpPercent={xpPercent}
          quests={quests}
          questsLoading={questsLoading}
          questsError={questsError}
          completeQuest={completeQuest}
          selectedAvatar={selectedAvatar}
          selectedAvatarImage={selectedAvatarImage}
          currentArena={currentArena}
          trophies={trophies}
          onOpenRoad={() => setActiveTab("road")}
          onOpenAvatar={() => setActiveTab("avatar")}
          onOpenShop={() => setActiveTab("shop")}
          onOpenQuestLog={() => setActiveTab("quests")}
        />
        )}

                {activeTab === "road" && (
          <TrophyRoad
            trophies={trophies}
            currentArena={currentArena}
            arenas={arenas}
            rewards={roadRewards}
            claimedRewards={claimedRewards}
            onClaim={claimRoadReward}
            onClose={() => setActiveTab("home")}
          />
        )}

        {activeTab === "quests" && (
        <QuestLogPage
          quests={quests}
          questsLoading={questsLoading}
          questsError={questsError}
          completeQuest={completeQuest}

          onClose={() =>
            setActiveTab("home")
          }

          onOpenAddAssignment={() => {
            setAssignmentError("");
            loadCourses();
            setShowAddAssignment(true);
          }}
        />
      )}

        {activeTab === "avatar" && (
          <AvatarScreen
          avatars={AVATARS}
          selectedAvatarId={selectedAvatarId}
          onSelectAvatar={setSelectedAvatarId}
          equippedCosmetics={equippedCosmetics}
          ownedCosmetics={ownedCosmetics}
          cosmetics={shopItems}
          onEquipCosmetic={equipCosmetic}
          onUnequipCosmetic={unequipCosmetic}
        />
        )}

        {activeTab === "shop" && (
          <ShopScreen
          coins={coins}
          ownedCosmetics={ownedCosmetics}
          onBuy={buyCosmetic}
        />
        )}
      </main>
      {activeTab !== "road" && activeTab !== "quests" && (
      <nav className="bottom-nav" aria-label="Main navigation">
        <NavButton icon="" label="Home" active={activeTab === "home"} onClick={() => setActiveTab("home")} />
        <NavButton icon="" label="Avatar" active={activeTab === "avatar"} onClick={() => setActiveTab("avatar")} />
        <NavButton icon="" label="Shop" active={activeTab === "shop"} onClick={() => setActiveTab("shop")} />
      </nav>
      )}
    </div>
  );
}

function AuthScreen({
  mode,
  setMode,
  form,
  setForm,
  error,
  onSubmit,
}) {
  const registering = mode === "register";

  return (
    <main className="auth-page">
      <section className="auth-card">
        <img
          src={ART.logo}
          alt="MataQUEST"
          className="auth-logo"
        />

        <h1>
          {registering
            ? "Create Account"
            : "Welcome Back"}
        </h1>

        <form onSubmit={onSubmit}>
          {registering && (
            <label>
              Display Name

              <input
                type="text"
                value={form.displayName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
                placeholder="user"
              />
            </label>
          )}

          <label>
            Username

            <input
              type="text"
              value={form.username}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              minLength={6}
              required
            />
          </label>

          {error && (
            <p className="auth-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="auth-submit"
          >
            {registering
              ? "CREATE ACCOUNT"
              : "LOGIN"}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() =>
            setMode(
              registering
                ? "login"
                : "register"
            )
          }
        >
          {registering
            ? "Already have an account? Login"
            : "New to MataQUEST? Create Account"}
        </button>
      </section>
    </main>
  );
}

function RewardReveal({
  reward,
  revealedContents,
  isChestOpening,
  onOpen,
  onClose,
}) {
  return (
    <div className="reward-reveal-overlay">
      <div
        className={`reward-reveal-panel ${
          revealedContents ? "reward-opened" : ""
        }`}
      >
        {!revealedContents ? (
          <>
            <p className="reward-reveal-label">
              {isChestOpening ? "OPENING..." : "CHEST UNLOCKED"}
            </p>

            <button
              type="button"
              className="reward-chest-button"
              onClick={onOpen}
              disabled={isChestOpening}
              aria-label={`Open ${reward.title}`}
            >
              <img
                src={reward.art}
                alt={reward.title}
                className={`reward-opening-chest ${
                  isChestOpening ? "is-opening" : ""
                }`}
              />
            </button>

            <h2>{reward.title}</h2>

            <p className="reward-open-instruction">
              {isChestOpening
                ? "Opening chest..."
                : "Click the chest to open"}
            </p>
          </>
        ) : (
          <>
            <p className="reward-reveal-label">YOU RECEIVED</p>

            <img
              src={reward.art}
              alt={reward.title}
              className="reward-opened-art"
            />

            <h2>{reward.title}</h2>

            <div className="revealed-reward-values">
              {revealedContents.coins && (
                <strong>+{revealedContents.coins} Coins</strong>
              )}

              {revealedContents.trophies && (
                <strong>
                  +{revealedContents.trophies} Trophies
                </strong>
              )}

              {revealedContents.xp && (
                <strong>+{revealedContents.xp} XP</strong>
              )}
            </div>

            <button type="button" onClick={onClose}>
              CONTINUE
            </button>
          </>
        )}
      </div>
    </div>
  );
}


function ArtSlot({ src, label, className = "" }) {
  if (src) return <img className={`art-slot ${className}`} src={src} alt={label} />;
  return <div className={`art-slot art-placeholder ${className}`} aria-label={`${label} placeholder`}><span>{label}</span></div>;
}

function HomeScreen({
  displayName,
  level,
  currentLevelXP,
  xpPerLevel,
  xpPercent,
  quests,
  questsLoading,
  questsError,
  completeQuest,
  selectedAvatar,
  selectedAvatarImage,
  currentArena,
  trophies,
  onOpenRoad,
  onOpenAvatar,
  onOpenShop,
  onOpenQuestLog
}) {
  const remainingQuests = quests.filter((quest) => !quest.completed).length;
  const completedQuests = quests.length - remainingQuests;

  const nextArena = arenas.find((arena) => arena.min > trophies);

  const arenaStart = currentArena.min;
  const arenaEnd =
    currentArena.max === Infinity
      ? currentArena.min + 1000
      : currentArena.max + 1;

  const arenaProgress = Math.min(
    Math.max(
      ((trophies - arenaStart) / (arenaEnd - arenaStart)) * 100,
      0
    ),
    100
  );

  const nextReward = roadRewards.find(
    (reward) => reward.threshold > trophies
  );

  return (
          <div className="game-home">
      <aside className="home-side-panel home-profile-panel">
        <button
          className="player-profile-card"
          type="button"
          onClick={onOpenAvatar}
        >
          <div className="profile-avatar">
            <img
              src={selectedAvatarImage}
              alt={`${selectedAvatar.name} avatar`}
              className="home-avatar-image pixel-art"
            />
          </div>

          <div>
            <h2>{displayName}</h2>
          </div>
        </button>

        <div className="home-xp-card">
          <div className="xp-row">
            <span>Level {level}</span>
            <span>Level {level + 1}</span>
          </div>

          <div className="xp-track">
            <div
              className="xp-fill"
              style={{ width: `${xpPercent}%` }}
            />
          </div>

          <strong>
            {currentLevelXP} / {xpPerLevel} XP
          </strong>
        </div>

        <div className="home-mini-stats">
          <StatCard
            icon="📝"
            value={remainingQuests}
            label="Active"
          />

          <StatCard
            icon="✅"
            value={completedQuests}
            label="Completed"
          />

          <StatCard
            icon="🔥"
            value="3"
            label="Streak"
          />
        </div>
      </aside>

      <section className="home-arena-column">
        <section className={`home-arena-card arena-${currentArena.theme}`}>
          <div className="arena-stage">

  {currentArena.art ? (
  <button
  className="arena-image-button"
  type="button"
  onClick={onOpenRoad}
  aria-label={`Open ${currentArena.name} Trophy Road`}
>
    <img
      src={currentArena.art}
      alt={currentArena.name}
      className="home-arena-image"
    />
  </button>
) : (
  <div className="arena-stage-placeholder">
    <span></span>
    <strong>{currentArena.name}</strong>
    <small>coming soon</small>
  </div>
)}

</div>
{/* <div className="arena-title-block">

    <h2>{currentArena.name}</h2>

    <div className="arena-reward-preview">

      <span className="arena-reward-label">
        NEXT REWARD
      </span>

      {nextReward && (
        <>
          <img
            src={nextReward.art}
            alt={nextReward.title}
            className="arena-next-reward-image"
          />

          <strong>{nextReward.title}</strong>

          <span>
            {nextReward.threshold - trophies}
            {" "}
            trophies away
          </span>
        </>
      )}

    </div>

</div> */}

<div className="home-arena-progress">
            <div className="arena-progress-copy">
              <span>TROPHI8ES {trophies}</span>

              <span>
                {nextArena
                  ? `${nextArena.min - trophies} until ${nextArena.name}`
                  : "Final arena reached"}
              </span>
            </div>

            <div className="arena-progress-track">
              <div
                className="arena-progress-fill"
                style={{ width: `${arenaProgress}%` }}
              />
            </div>
          </div>

        </section>
      </section>

      <aside className="home-side-panel home-actions-panel">
        <div className="next-reward-card">
          <span className="home-label">NEXT REWARD</span>

          {nextReward ? (
            <>
              <ArtSlot
                src={nextReward.art}
                label={nextReward.title}
                className="next-reward-art"
              />

              <h3>{nextReward.title}</h3>
              <p>
                Unlocks at {nextReward.threshold} trophies
              </p>

              <strong>
                {nextReward.threshold - trophies} trophies away
              </strong>
            </>
          ) : (
            <>
              <h3>Trophy road is complete</h3>
              <p>You reached every current milestone.</p>
            </>
          )}
        </div>

        <button
  type="button"
  className="weekly-challenge-card weekly-challenge-button"
  onClick={onOpenQuestLog}
>
  <span className="home-label">
    WEEKLY CHALLENGE
  </span>

  <h3>Complete 5 Quests</h3>

  <div className="challenge-progress-track">
    <div
      className="challenge-progress-fill"
      style={{
        width: `${Math.min(
          (completedQuests / 5) * 100,
          100
        )}%`,
      }}
    />
  </div>

  <div className="weekly-challenge-footer">
    <p>
      {Math.min(completedQuests, 5)} / 5 complete
    </p>

    <strong>VIEW QUESTS →</strong>
  </div>
</button>
      </aside>
    </div>
  );
}
function QuestCard({ quest, onComplete }) {
  return (
    <article className={`quest-card ${quest.completed ? "quest-completed" : ""}`}>
      <div className="quest-icon">{quest.completed ? "✅" : "-"}</div>
      <div className="quest-info"><span className="course-tag">{quest.course}</span><h3>{quest.title}</h3><p>Due: {quest.due}</p></div>
      <div className="reward-panel"><span> +{quest.xp}</span><span> +{quest.trophies}</span></div>
      <button className="complete-button" disabled={quest.completed} onClick={() => onComplete(quest.id)}>{quest.completed ? "Quest Complete" : "Complete Quest"}</button>
    </article>
  );
}

function QuestLogPage({
  quests,
  questsLoading,
  questsError,
  completeQuest,
  onClose,
  onOpenAddAssignment,
}) {
  const remainingQuests =
    quests.filter((quest) => !quest.completed).length;

  const completedQuests =
    quests.length - remainingQuests;

  const weeklyProgress =
    Math.min((completedQuests / 5) * 100, 100);

  return (
    <section className="quest-log-page">

      <header className="quest-log-header">
        <div>
          <h1>QUESTS</h1>
        </div>

        <button
          type="button"
          className="quest-log-close-button"
          onClick={onClose}
        >
          ✕
        </button>
      </header>


      <section className="quest-weekly-panel">
        <div className="quest-weekly-copy">
          <span>WEEKLY CHALLENGE</span>

          <h2>Complete 5 Quests</h2>

          <p>
            Complete assignments to finish this week's challenge.
          </p>
        </div>

        <div className="quest-weekly-progress">
          <strong>
            {Math.min(completedQuests, 5)} / 5
          </strong>

          <div className="quest-weekly-track">
            <div
              className="quest-weekly-fill"
              style={{
                width: `${weeklyProgress}%`,
              }}
            />
          </div>
        </div>
      </section>


      <section className="quest-log-content">

        <div className="quest-log-section-heading">
      <div>
        <span>CANVAS QUEST LOG</span>
        <h2>Assignments</h2>
      </div>

      <div className="quest-log-heading-actions">
        <strong>
          {remainingQuests} remaining
        </strong>

        <button
          type="button"
          className="add-assignment-button"
          onClick={onOpenAddAssignment}
        >
          + ADD ASSIGNMENT
        </button>
      </div>
    </div>


        {questsLoading && (
          <p className="quest-log-status">
            Loading quests...
          </p>
        )}


        {questsError && (
          <p className="quest-log-status quest-log-error">
            {questsError}
          </p>
        )}


        {!questsLoading &&
          !questsError &&
          quests.length === 0 && (
            <p className="quest-log-status">
              No assignments available.
            </p>
          )}


        {!questsLoading &&
          !questsError &&
          quests.length > 0 && (
            <div className="quest-log-list">
              {quests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onComplete={completeQuest}
                />
              ))}
            </div>
          )}

      </section>


      <button
        type="button"
        className="quest-log-ok-button"
        onClick={onClose}
      >
        OK
      </button>

    </section>
  );
}

function TrophyRoadOld({
  trophies,
  currentArena,
  claimedRewards,
  onClaim,
}) {
  const nextArena = arenas.find((arena) => arena.min > trophies);
  const [openingChest, setOpeningChest] = useState(null);

  function handleChestClick(reward) {
    if (openingChest) return;

    setOpeningChest(reward.id);

    setTimeout(() => {
      onClaim(reward);
      setOpeningChest(null);
    }, 1800);
  }

  return (
    <section className="panel-page trophy-page">
      <div className="road-header">
        <div>
          <p className="eyebrow">SEMESTER PROGRESSION</p>
          <h2>Trophy Road</h2>
          <p className="page-description">
            Advance through three arenas during your academic journey.
            Milestones require consistent coursework. Will you make it to
            the end?
          </p>
        </div>

        <div className="road-balance">
          <span>YOUR TROPHIES</span>
          <strong>{trophies}</strong>
        </div>
      </div>

      <div className="arena-grid">
        {arenas.map((arena, index) => (
          <article
            className={`arena-card arena-${arena.theme} ${
              arena.id === currentArena.id ? "arena-current" : ""
            }`}
            key={arena.id}
          >
            <span className="arena-number">ARENA {index + 1}</span>
            <h3>{arena.name}</h3>

            <ArtSlot
              src={arena.art}
              label={`${arena.name} art`}
              className="arena-art"
            />

            <strong>{arena.range}</strong>
            <p>{arena.subtitle}</p>
          </article>
        ))}
      </div>

      <div className="current-arena-banner">
        <div>
          <span>CURRENT ARENA</span>
          <h3>{currentArena.name}</h3>
        </div>

        <div>
          {nextArena ? (
            <>
              <span>NEXT ARENA</span>
              <strong>
                {Math.max(nextArena.min - trophies, 0)} trophies away
              </strong>
            </>
          ) : (
            <>
              <span>FINAL ARENA</span>
              <strong>Keep climbing</strong>
            </>
          )}
        </div>
      </div>

      <div className="reward-road">
        <div className="road-line" />

        {roadRewards.map((reward, index) => {
          const available = trophies >= reward.threshold;
          const claimed = claimedRewards.includes(reward.id);
          const isOpening = openingChest === reward.id;

          return (
            <article
              key={reward.id}
              className={`reward-stop ${
                index % 2 ? "reward-right" : "reward-left"
              } ${available ? "reward-available" : ""} ${
                claimed ? "reward-claimed" : ""
              }`}
            >
              <div
                className={`floating-island ${
                  isOpening ? "chest-opening" : ""
                }`}
              >
                {isOpening && <div className="reward-burst" />}

                <ArtSlot
                  src={reward.art}
                  label={reward.title}
                  className="reward-art"
                />
              </div>

              <div className="reward-copy">
                <span className="reward-type">{reward.type}</span>
                <h3>{reward.title}</h3>
                <p>{reward.description}</p>
                <strong>{reward.threshold} trophies</strong>

                <button
                  disabled={!available || claimed || isOpening}
                  onClick={() => handleChestClick(reward)}
                >
                  {claimed
                    ? "Claimed"
                    : isOpening
                      ? "Opening..."
                      : available
                        ? "Claim Reward"
                        : "Locked"}
                </button>
              </div>

              <div className="road-node">
                {claimed ? "✓" : available ? "!" : "🔒"}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
function AvatarScreen({
  avatars,
  selectedAvatarId,
  onSelectAvatar,
  equippedCosmetics,
  ownedCosmetics,
  cosmetics,
  onEquipCosmetic,
  onUnequipCosmetic,
}) {
  const [lockerTab, setLockerTab] = useState("characters");

  const selectedAvatar =
    avatars.find((avatar) => avatar.id === selectedAvatarId) ??
    avatars[0];

  const selectedAvatarImage =
    equippedCosmetics.hat === "hat"
      ? selectedAvatar.sprites.hat.front
      : selectedAvatar.sprites.normal.front;

  return (
    <section className="locker-page">

      {/* LEFT SIDE */}
      <div className="locker-preview">
        <div className="locker-character-stage">
          <img
            src={selectedAvatarImage}
            alt={selectedAvatar.name}
            className="locker-character-image pixel-art"
          />
        </div>

        <div className="locker-character-info">
          <span>SELECTED CHARACTER</span>
          <h2>{selectedAvatar.name}</h2>
        </div>
      </div>


      {/* RIGHT SIDE */}
      <div className="locker-selection">

        <div className="locker-heading">
          <h1>AVATAR</h1>
        </div>

        <div className="locker-tabs">
          <button
            type="button"
            className={
              lockerTab === "characters"
                ? "locker-tab locker-tab-active"
                : "locker-tab"
            }
            onClick={() => setLockerTab("characters")}
          >
            CHARACTERS
          </button>

          <button
            type="button"
            className={
              lockerTab === "cosmetics"
                ? "locker-tab locker-tab-active"
                : "locker-tab"
            }
            onClick={() => setLockerTab("cosmetics")}
          >
            COSMETICS
          </button>
        </div>


        {/* CHARACTER GRID */}
        {lockerTab === "characters" && (
          <div className="locker-grid">

            {avatars.map((avatar) => {
              const selected =
                selectedAvatarId === avatar.id;

              const avatarImage =
                equippedCosmetics.hat === "hat"
                  ? avatar.sprites.hat.front
                  : avatar.sprites.normal.front;

              return (
                <button
                  key={avatar.id}
                  type="button"
                  className={`locker-tile ${
                    selected ? "locker-tile-selected" : ""
                  }`}
                  onClick={() =>
                    onSelectAvatar(avatar.id)
                  }
                >
                  <img
                    src={avatarImage}
                    alt={avatar.name}
                    className="locker-tile-image pixel-art"
                  />

                  <span>{avatar.name}</span>
                </button>
              );
            })}

          </div>
        )}


        {/* COSMETIC GRID */}
        {lockerTab === "cosmetics" && (
          <div className="locker-grid">

            {/* NONE */}
            <button
              type="button"
              className={`locker-tile ${
                !equippedCosmetics.hat
                  ? "locker-tile-selected"
                  : ""
              }`}
              onClick={() =>
                onUnequipCosmetic("hat")
              }
            >
              <div className="locker-none-icon">
              </div>

              <span>None</span>
            </button>


            {cosmetics.map((item) => {
              const owned =
                ownedCosmetics.includes(item.id);

              const equipped =
                equippedCosmetics[item.category] ===
                item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`locker-tile ${
                    equipped
                      ? "locker-tile-selected"
                      : ""
                  } ${
                    !owned
                      ? "locker-tile-locked"
                      : ""
                  }`}
                  disabled={!owned}
                  onClick={() =>
                    onEquipCosmetic(item)
                  }
                >
                  <ArtSlot
                    src={item.art}
                    label={item.name}
                    className="locker-cosmetic-image"
                  />

                  <span>{item.name}</span>

                  {!owned && (
                    <strong className="locker-lock">
                      LOCKED
                    </strong>
                  )}
                </button>
              );
            })}

          </div>
        )}

      </div>

    </section>
  );
}

function ShopScreen({
  coins,
  ownedCosmetics,
  onBuy,
}) {
  return (
    <section className="shop-page">
      <div className="shop-page-header">
        <div>
          <h2>SHOP</h2>
        </div>

        <div className="shop-coin-balance">
          <img
            src="/assets/rewards/coin.png"
            alt="Coins"
            className="shop-coin-icon"
          />

          <strong>{coins}</strong>
        </div>
      </div>

      <div className="shop-scroll">
        {shopItems.map((item) => {
          const owned = ownedCosmetics.includes(item.id);
          const affordable = coins >= item.cost;

          return (
            <article
              className={`shop-item-card rarity-${item.rarity.toLowerCase()}`}
              key={item.id}
            >
              <div className="shop-item-top">
                <span className="shop-item-rarity">
                  {item.rarity}
                </span>

                <h3>{item.name}</h3>
              </div>

              <div className="shop-item-art-area">
                <ArtSlot
                  src={item.art}
                  label={item.name}
                  className={`shop-item-art shop-item-art-${item.id}`}
                />
              </div>

              <button
                type="button"
                className={`shop-price-button ${
                  owned ? "shop-owned" : ""
                }`}
                disabled={owned || !affordable}
                onClick={() => onBuy(item)}
              >
                {owned ? (
                  "OWNED"
                ) : (
                  <>
                    <img
                      src="/assets/rewards/coin.png"
                      alt=""
                      className="shop-price-coin"
                    />

                    <span>{item.cost}</span>
                  </>
                )}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
function StatCard({ icon, value, label }) {
  return <div className="stat-card"><span>{icon}</span><strong>{value}</strong><p>{label}</p></div>;
}

function NavButton({ icon, label, active, onClick }) {
  return <button className={`nav-button ${active ? "nav-active" : ""}`} onClick={onClick}><span>{icon}</span>{label}</button>;
}

export default App;