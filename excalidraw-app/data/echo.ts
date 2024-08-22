import Echo from "laravel-echo";

const initEcho = (token: String) => {
  const echo = new Echo({
    broadcaster: "pusher",
    authEndpoint: `${
      import.meta.env.VITE_APP_TAIGA_BACKEND_URL
    }/broadcasting/auth`,
    auth: {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
    key: import.meta.env.VITE_APP_TAIGA_WS_APP_KEY,
    wsHost: import.meta.env.VITE_APP_TAIGA_WS_HOST,
    wsPort: import.meta.env.VITE_APP_TAIGA_WS_PORT,
    forceTLS: false,
    encrypted: true,
    disableStats: true,
    enabledTransports: ["ws", "wss"],
  });
  return echo;
};
export default initEcho;
