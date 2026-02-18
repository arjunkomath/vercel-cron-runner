interface VercelConfig {
  crons: { path: string; schedule: string }[];
}

export const config: VercelConfig = {
  crons: [
    {
      path: "/get",
      schedule: "* * * * *",
    },
  ],
};
