const clerkJwtIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!clerkJwtIssuerDomain) {
  throw new Error(
    "CLERK_JWT_ISSUER_DOMAIN is required. Set it in your Convex environment variables."
  );
}

export default {
  providers: [
    {
      domain: clerkJwtIssuerDomain,
      applicationID: "convex",
    },
  ],
};
