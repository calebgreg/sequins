Deno.serve(async (req) => {
    return Response.json({ appId: Deno.env.get("BASE44_APP_ID") });
});