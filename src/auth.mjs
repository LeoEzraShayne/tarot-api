import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { query } from './db/pool.mjs';
const googleClient=new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');

export async function signInWithGoogle(credential){
  if(!process.env.GOOGLE_CLIENT_ID)throw Object.assign(new Error('Google sign-in is not configured.'),{statusCode:503});
  const ticket=await googleClient.verifyIdToken({idToken:credential,audience:process.env.GOOGLE_CLIENT_ID});
  const payload=ticket.getPayload();if(!payload?.sub)throw Object.assign(new Error('Invalid Google credential.'),{statusCode:401});
  const id=crypto.randomUUID();
  const user=(await query(`INSERT INTO users(id,google_sub,email,name,picture_url) VALUES($1,$2,$3,$4,$5) ON CONFLICT(google_sub) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,picture_url=EXCLUDED.picture_url RETURNING id,email,name,picture_url`,[id,payload.sub,payload.email||null,payload.name||null,payload.picture||null])).rows[0];
  const token=crypto.randomBytes(32).toString('base64url'),expires=new Date(Date.now()+30*24*60*60*1000);
  await query('INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',[sha(token),user.id,expires]);
  return {token,expires,user};
}
export async function currentUser(request){const token=request.cookies?.tarot_session;if(!token)return null;return (await query(`SELECT u.id,u.email,u.name,u.picture_url FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,[sha(token)])).rows[0]||null;}
export async function logout(token){if(token)await query('DELETE FROM auth_sessions WHERE token_hash=$1',[sha(token)]);}
