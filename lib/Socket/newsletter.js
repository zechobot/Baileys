//=======================================================//
import { executeWMexQuery as genericExecuteWMexQuery } from "./mex.js";
import { generateProfilePicture, loadBase } from "../Utils/messages-media.js";
import { getBinaryNodeChild } from "../WABinary/index.js";
import { QueryIds, XWAPaths } from "../Types/index.js";
import { makeGroupsSocket } from "./groups.js";
//=======================================================//
    
const extractNewsletterMetadata = (node, isCreate) => {
    const result = getBinaryNodeChild(node, 'result')?.content?.toString()
    const metadataPath = JSON.parse(result).data[isCreate ? XWAPaths.xwa2_newsletter_create : "xwa2_newsletter"]
    
    const metadata = {
        id: metadataPath?.id,
        state: metadataPath?.state?.type,
        creation_time: +metadataPath?.thread_metadata?.creation_time,
        name: metadataPath?.thread_metadata?.name?.text,
        nameTime: +metadataPath?.thread_metadata?.name?.update_time,
        description: metadataPath?.thread_metadata?.description?.text,
        descriptionTime: +metadataPath?.thread_metadata?.description?.update_time,
        invite: metadataPath?.thread_metadata?.invite,
        handle: metadataPath?.thread_metadata?.handle,
        reaction_codes: metadataPath?.thread_metadata?.settings?.reaction_codes?.value,
        subscribers: +metadataPath?.thread_metadata?.subscribers_count,
        verification: metadataPath?.thread_metadata?.verification,
        viewer_metadata: metadataPath?.viewer_metadata
    }
    return metadata
}
    
const parseNewsletterCreateResponse = (response) => {
  const { id, thread_metadata: thread, viewer_metadata: viewer } = response;
  return {
    id: id,
    owner: undefined,
    name: thread.name.text,
    creation_time: parseInt(thread.creation_time, 10),
    description: thread.description.text,
    invite: thread.invite,
    subscribers: parseInt(thread.subscribers_count, 10),
    verification: thread.verification,
    picture: {
      id: thread?.picture?.id || null,
      directPath: thread?.picture?.direct_path || null
    },
    mute_state: viewer.mute
  };
};
const parseNewsletterMetadata = (result) => {
  if (typeof result !== "object" || result === null) {
    return null;
  }
  if ("id" in result && typeof result.id === "string") {
    return result;
  }
  if ("result" in result && typeof result.result === "object" && result.result !== null && "id" in result.result) {
    return result.result;
  }
  return null;
};

export const makeNewsletterSocket = (config) => {
  const sock = makeGroupsSocket(config);
  const { delay, query, generateMessageTag } = sock;
  const encoder = new TextEncoder()
  const newsletterWMexQuery = async (jid, queryId, content) => (query({
        tag: 'iq',
        attrs: {
            id: generateMessageTag(),
            type: 'get',
            xmlns: 'w:mex',
            to: "@s.whatsapp.net",
        },
        content: [
            {
                tag: 'query',
                attrs: { 'query_id': queryId },
                content: encoder.encode(JSON.stringify({
                    variables: {
                        'newsletter_id': jid,
                        ...content
                    }
                }))
            }
        ]
    }))
  const executeWMexQuery = (variables, queryId, dataPath) => {
    return genericExecuteWMexQuery(variables, queryId, dataPath, query, generateMessageTag);
  };
  const newsletterMetadata = async (type, key, role) => {
        const result = await newsletterWMexQuery(undefined, QueryIds.METADATA, {
            input: {
                key,
                type: type.toUpperCase(),
                view_role: role || 'GUEST'
            },
            fetch_viewer_metadata: true,
            fetch_full_image: true,
            fetch_creation_time: true
        })
            
        return extractNewsletterMetadata(result)
    }
  const newsletterUpdate = async (jid, updates) => {
    const variables = {
      newsletter_id: jid,
      updates: {
        ...updates,
        settings: null
      }
    };
    return executeWMexQuery(variables, QueryIds.UPDATE_METADATA, "xwa2_newsletter_update");
  };

loadBase(newsletterWMexQuery, QueryIds)
  
  return {
    ...sock,
    newsletterCreate: async (name, description) => {
      const variables = {
        input: {
          name,
          description: description ?? null
        }
      };
      const rawResponse = await executeWMexQuery(variables, QueryIds.CREATE, XWAPaths.xwa2_newsletter_create);
     return parseNewsletterCreateResponse(rawResponse);
    },
    newsletterUpdate,
    newsletterMetadata, 
    newsletterFetchAllParticipating: async () => {
        	const data = {}
        
        	const result = await newsletterWMexQuery(undefined, QueryIds.SUBSCRIBERS) 
        	const child = JSON.parse(getBinaryNodeChild(result, 'result')?.content?.toString())
        	const newsletters = child.data["xwa2_newsletter_subscribed"]
        
        	for (const i of newsletters) {
        		if (i.id == null) continue
        	
        		const metadata = await newsletterMetadata('JID', i.id) 
        		if (metadata.id !== null) data[metadata.id] = metadata
        	}
        	
        	return data
        },
    newsletterUnfollow: async (jid) => {
            await newsletterWMexQuery(jid, QueryIds.UNFOLLOW)
        },
        newsletterFollow: async (jid) => {
            await newsletterWMexQuery(jid, QueryIds.FOLLOW)
        },
    newsletterMute: (jid) => {
      return executeWMexQuery({ newsletter_id: jid }, QueryIds.MUTE, XWAPaths.xwa2_newsletter_mute_v2);
    },
    newsletterUnmute: (jid) => {
      return executeWMexQuery({ newsletter_id: jid }, QueryIds.UNMUTE, XWAPaths.xwa2_newsletter_unmute_v2);
    },
    newsletterUpdateName: async (jid, name) => {
      return await newsletterUpdate(jid, { name });
    },
    newsletterUpdateDescription: async (jid, description) => {
      return await newsletterUpdate(jid, { description });
    },
    newsletterUpdatePicture: async (jid, content) => {
      const { img } = await generateProfilePicture(content);
      return await newsletterUpdate(jid, { picture: img.toString("base64") });
    },
    newsletterRemovePicture: async (jid) => {
      return await newsletterUpdate(jid, { picture: "" });
    },
    newsletterReactMessage: async (jid, serverId, reaction) => {
      await query({
        tag: "message",
        attrs: {
          to: jid,
          ...(reaction ? {} : { edit: "7" }),
          type: "reaction",
          server_id: serverId,
          id: generateMessageTag()
        },
        content: [
          {
            tag: "reaction",
            attrs: reaction ? { code: reaction } : {}
          }
        ]
      });
    },
    newsletterFetchMessages: async (jid, count, since, after) => {
      const messageUpdateAttrs = {
        count: count.toString()
      };
      if (typeof since === "number") {
        messageUpdateAttrs.since = since.toString();
      }
      if (after) {
        messageUpdateAttrs.after = after.toString();
      }
      const result = await query({
        tag: "iq",
        attrs: {
          id: generateMessageTag(),
          type: "get",
          xmlns: "newsletter",
          to: jid
        },
        content: [
          {
            tag: "message_updates",
            attrs: messageUpdateAttrs
          }
        ]
      });
      return result;
    },
    subscribeNewsletterUpdates: async (jid) => {
      const result = await query({
        tag: "iq",
        attrs: {
          id: generateMessageTag(),
          type: "set",
          xmlns: "newsletter",
          to: jid
        },
        content: [{ tag: "live_updates", attrs: {}, content: [] }]
      });
      const liveUpdatesNode = getBinaryNodeChild(result, "live_updates");
      const duration = liveUpdatesNode?.attrs?.duration;
      return duration ? { duration: duration } : null;
    },
    newsletterAdminCount: async (jid) => {
      const response = await executeWMexQuery({ newsletter_id: jid }, QueryIds.ADMIN_COUNT, XWAPaths.xwa2_newsletter_admin_count);
      return response.admin_count;
    },
    newsletterChangeOwner: async (jid, newOwnerJid) => {
      await executeWMexQuery({ newsletter_id: jid, user_id: newOwnerJid }, QueryIds.CHANGE_OWNER, XWAPaths.xwa2_newsletter_change_owner);
    },
    newsletterDemote: async (jid, userJid) => {
      await executeWMexQuery({ newsletter_id: jid, user_id: userJid }, QueryIds.DEMOTE, XWAPaths.xwa2_newsletter_demote);
    },
    newsletterDelete: async (jid) => {
      await executeWMexQuery({ newsletter_id: jid }, QueryIds.DELETE, XWAPaths.xwa2_newsletter_delete_v2);
    }
  };
};
//=======================================================//
