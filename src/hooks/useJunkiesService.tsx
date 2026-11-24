import {useAtom} from "jotai";
import {loadingAtom, notifyMessageAtom, userAtom} from "../context/atoms";
import {useCallback, useMemo} from "react";
import {junkiesApi} from "../api/JunkiesApi";
import {defaultImageUrl} from "./useArtistDetails";
import {EBoxComment, EBoxSet, EBoxUserVote, EBoxVote, EBoxVotes, JunkiesService, NotifyMessage} from "./types";
import {htmlZuText} from "../bundles/common/text";
import {alsParameter, FilterEntwurf} from "../bundles/filtereditor/filterModel";
import {mapEBoxVoteToNumber, mapNumberToEBoxVote} from "../bundles/common/helper";

const zahl = (wert: any): number => Number.parseInt(String(wert));
const datum = (sekunden: any): Date => new Date(zahl(sekunden) * 1000);

function mapUserVote(json: any): EBoxUserVote {
    return {uid: zahl(json.uid), name: json.name ?? "", vote: zahl(json.vote), timestamp: datum(json.timestamp)};
}

function mapVotes(json: any): EBoxVotes | undefined {
    if (!json) {
        return undefined;
    }
    const all: EBoxUserVote[] = Array.isArray(json.all) ? json.all.map(mapUserVote) : [];
    return {
        ...json.avg !== null && json.avg !== undefined && {avg: Number(json.avg)},
        count: zahl(json.count ?? all.length) || 0,
        all,
        ...json.firstgoodvote && {firstGood: mapUserVote(json.firstgoodvote)},
    };
}

/** nur veröffentlichte Kommentare (Drupal 6: status 0), in Thread-Reihenfolge */
function mapComments(json: any): EBoxComment[] {
    if (!Array.isArray(json)) {
        return [];
    }
    return json.filter((c: any) => zahl(c.status) === 0)
        .map((c: any) => ({
            cid: zahl(c.cid),
            pid: zahl(c.pid),
            uid: zahl(c.uid),
            name: c.name ?? "",
            subject: htmlZuText(c.subject),
            text: htmlZuText(c.comment),
            timestamp: datum(c.timestamp),
            thread: c.thread ?? "",
        }))
        .sort((a: EBoxComment, b: EBoxComment) => a.thread.replace(/\/$/, "").localeCompare(b.thread.replace(/\/$/, "")));
}

//convert from json format to our own EBoxSet format (reduced)
export function mapFromJsonSet(api: any, set: any): EBoxSet {
    return {
        nid: zahl(set.nid),
        title: set.title,
        artists: (set.artists ?? []).map((a: any) => zahl(a.artistnid)),
        duration: new Date(set.duration * 1000),
        created: datum(set.setcreated),
        ...set.lastheard && {lastheard: datum(set.lastheard)},

        bookmarked: set.bookmarked,
        myVote: mapNumberToEBoxVote(Number.parseInt(set.votes?.my)),
        ...set.taxonomy && {genres: Object.values(set.taxonomy).map((t: any) => ({name: t.name, tid: zahl(t.tid)}))},

        tracks: (set.trackinfo ?? []).map((track: any) => {
            return {
                nid: zahl(set.nid),
                title: track.title || set.title,
                artist: track.artist,
                url: api.buildTrackUrl(set.nid, track.downloadfilename),
                ...track.duration && {duration: zahl(track.duration)},
            }
        }),
        artistDetails: [{
            nid: 0,
            djid: 0,
            name: "unbekannt",
            artwork: {
                small: defaultImageUrl,
                large: defaultImageUrl,
                extralarge: defaultImageUrl,
                mega: defaultImageUrl
            }
        }],
        votes: mapVotes(set.votes),
        comments: mapComments(set.comments),
        ...set.dj?.name && {djName: set.dj.name},
        // für die Pflege (E6): Eigentümer, Status, djids der Artists
        ...set.uid !== null && set.uid !== undefined && {uid: zahl(set.uid)},
        ...set.status !== null && set.status !== undefined && {status: zahl(set.status)},
        djids: (set.artists ?? []).map((a: any) => zahl(a.djid)).filter((d: number) => d > 0),
        ...set.pflege && {pflege: {
            unfertig: Boolean(set.pflege.unfertig),
            deaktiviert: Boolean(set.pflege.deaktiviert),
            herkunft: set.pflege.herkunft ?? null,
            artistdetection_disabled: Boolean(set.pflege.artistdetection_disabled),
            taxonomy_by_dj: Boolean(set.pflege.taxonomy_by_dj),
            fulltitle: set.pflege.fulltitle ?? "",
        }},
    } as EBoxSet;
}

function mapFromJsonSetlist(api: any, jsonSetList: Array<any>): EBoxSet[] {
    return jsonSetList.map(set => mapFromJsonSet(api, set));
}

export const useJunkiesService = (): JunkiesService => {
    const [user] = useAtom(userAtom);
    const [, setLoading] = useAtom(loadingAtom);
    const [, setNotifyMessage] = useAtom(notifyMessageAtom);
    const showError = useCallback((error: Error) => {
        console.log(error);
        setNotifyMessage({
            message: error.message,
            severity: "error",
            autohide: 10000
        } as NotifyMessage)
    }, [setNotifyMessage]);

    return useMemo(() => {
        return {
            buildTrackUrl: (nid: number, downloadfilename: string) => {
                return junkiesApi(user).buildTrackUrl(nid, downloadfilename);
            },

            filterlist: (filterid: number) => {
                return junkiesApi(user).filterlist(filterid)
                    .then(result => result.filters)
                    .catch(showError)
            },

            setlist: (searchParams: any) => {
                setLoading(true)
                return junkiesApi(user).setlist(searchParams)
                    .then(sets => mapFromJsonSetlist(junkiesApi(user), sets))
                    .finally(() => setLoading(false))
            },

            set: (nid: number) => {
                setLoading(true)
                return junkiesApi(user).retrieve(nid)
                    // inaktive oder unbekannte Sets: leeres Objekt ohne nid
                    .then(json => json && json.nid ? mapFromJsonSet(junkiesApi(user), json) : undefined)
                    .finally(() => setLoading(false))
            },

            genres: () => junkiesApi(user).genres(),

            artists: (suche: {s: string} | {djid: number[]}) => junkiesApi(user).artists(suche),

            saveFilter: (entwurf: FilterEntwurf) => {
                const params = {
                    ...alsParameter(entwurf.kriterien),
                    ...entwurf.filterid && {filterid: entwurf.filterid},
                    filtername: entwurf.filtername.trim(),
                    is_preset: entwurf.is_preset ? 1 : 0,
                    ersetzen: 1,
                };
                return junkiesApi(user).editfilter(params).then((antwort: any) => {
                    if (!antwort?.successful) {
                        throw new Error(antwort?.message || "Filter konnte nicht gespeichert werden");
                    }
                    return antwort.filter;
                });
            },

            deleteFilter: (filterid: number) => junkiesApi(user).deletefilter(filterid).then((antwort: any) => {
                if (!antwort?.successful) {
                    throw new Error(antwort?.message || "Filter konnte nicht gelöscht werden");
                }
            }),

            playing: () => {
                return junkiesApi(user).playing()
                    .then((plays: any[]) => plays.map(p => ({
                        timestamp: datum(p.timestamp),
                        uid: zahl(p.uid),
                        name: p.name ?? "",
                        caller: p.caller ?? "",
                        set: mapFromJsonSet(junkiesApi(user), p.set),
                    })))
            },

            playinform: (nid: number) => {
                return junkiesApi(user).playinform(nid).catch(showError)
            },

            vote: (nid: number, vote: EBoxVote) => {
                return junkiesApi(user).vote(nid, mapEBoxVoteToNumber(vote)).catch(showError)
            },

            bookmark: (nid: number, createBookmark: boolean) => {
                if (createBookmark) {
                    return junkiesApi(user).addbookmark(nid).catch(showError);
                }
                return junkiesApi(user).delbookmark(nid).catch(showError)
            },

            createComment: (nid: number, text: string) => {
                return junkiesApi(user).createComment(nid, text)
                    .catch(showError);
            }
        }
    }, [user, showError, setLoading]);
};
