import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { API_BASE_URL } from "../config";
import { useTheme } from "../styles/ThemeContext";

const SCREEN_WIDTH = Dimensions.get("window").width;

function formatTime(value) {
  if (!value) return "Unknown time";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function mediaUrlOf(media) {
  if (!media) return "";
  if (typeof media === "string") return media;
  return media.media_url || media.storage_url || "";
}

function mediaTypeOf(media) {
  if (!media || typeof media === "string") return "image";
  return (media.media_type || "image").toString().toLowerCase();
}

function categoryColor(category) {
  const key = (category || "").toLowerCase();
  if (key.includes("fire")) return "#D85A30";
  if (key.includes("traffic")) return "#BA7517";
  if (key.includes("accident")) return "#185FA5";
  if (key.includes("crime")) return "#534AB7";
  if (key.includes("rescue")) return "#0F6E56";
  if (key.includes("protest")) return "#993556";
  if (key.includes("disaster")) return "#A32D2D";
  if (key.includes("infra")) return "#3B6D11";
  if (key.includes("outage")) return "#5F5E5A";
  return "#6B7280";
}

function categoryIcon(category) {
  const categoryIcons = {
    Accident: "car",
    Crime: "alert-circle",
    Infrastructure: "construct",
    Social: "people",
    Emergency: "warning",
    Weather: "thunderstorm",
    Fire: "flame",
    Protest: "megaphone",
    Traffic: "car-sport",
    Health: "medkit",
    Disaster: "alert-outline",
    "Natural Disaster": "earth",
    Flood: "water",
    Earthquake: "pulse",
  };
  return categoryIcons[category] || "alert-circle";
}

function credibilityColor(score) {
  if (score >= 0.8) return "#2ECC71";
  if (score >= 0.6) return "#F39C12";
  return "#E74C3C";
}

async function interactWithPost(postId, interactionType) {
  let token = await AsyncStorage.getItem("authToken");
  if (token) token = token.trim();
  if (!token) {
    throw new Error("Authentication required. Please log in again.");
  }

  const response = await fetch(`${API_BASE_URL}/posts/${postId}/interact`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ interaction_type: interactionType }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const msg =
      data?.detail?.details?.message ||
      data?.detail ||
      `Failed to ${interactionType} post`;
    throw new Error(
      typeof msg === "string" ? msg : `Failed to ${interactionType} post`,
    );
  }

  return data;
}

const PostInteractionBar = memo(
  ({ postId, initialUpvotes, initialDownvotes, colors, onError }) => {
    const [isUpvoted, setIsUpvoted] = useState(false);
    const [isDownvoted, setIsDownvoted] = useState(false);
    const [upvotes, setUpvotes] = useState(initialUpvotes || 0);
    const [downvotes, setDownvotes] = useState(initialDownvotes || 0);
    const requestIdRef = useRef(0);

    const upScale = useRef(new Animated.Value(1)).current;
    const downScale = useRef(new Animated.Value(1)).current;

    const animate = (v) => {
      Animated.sequence([
        Animated.timing(v, {
          toValue: 0.88,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(v, { toValue: 1, duration: 90, useNativeDriver: true }),
      ]).start();
    };

    const fmt = (count) => {
      if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
      if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
      return count > 0 ? String(count) : "";
    };

    const handleUpvote = async () => {
      animate(upScale);
      const req = ++requestIdRef.current;
      const prev = { isUpvoted, isDownvoted, upvotes, downvotes };

      if (isUpvoted) {
        setIsUpvoted(false);
        setUpvotes((v) => Math.max(0, v - 1));
      } else {
        setIsUpvoted(true);
        setUpvotes((v) => v + 1);
        if (isDownvoted) {
          setIsDownvoted(false);
          setDownvotes((v) => Math.max(0, v - 1));
        }
      }

      try {
        const res = await interactWithPost(postId, "upvote");
        if (req === requestIdRef.current && res?.success) {
          setUpvotes(Number(res.details?.new_upvotes || 0));
          setDownvotes(Number(res.details?.new_downvotes || 0));
        }
      } catch (e) {
        if (req === requestIdRef.current) {
          setIsUpvoted(prev.isUpvoted);
          setIsDownvoted(prev.isDownvoted);
          setUpvotes(prev.upvotes);
          setDownvotes(prev.downvotes);
          onError?.(e.message);
        }
      }
    };

    const handleDownvote = async () => {
      animate(downScale);
      const req = ++requestIdRef.current;
      const prev = { isUpvoted, isDownvoted, upvotes, downvotes };

      if (isDownvoted) {
        setIsDownvoted(false);
        setDownvotes((v) => Math.max(0, v - 1));
      } else {
        setIsDownvoted(true);
        setDownvotes((v) => v + 1);
        if (isUpvoted) {
          setIsUpvoted(false);
          setUpvotes((v) => Math.max(0, v - 1));
        }
      }

      try {
        const res = await interactWithPost(postId, "downvote");
        if (req === requestIdRef.current && res?.success) {
          setUpvotes(Number(res.details?.new_upvotes || 0));
          setDownvotes(Number(res.details?.new_downvotes || 0));
        }
      } catch (e) {
        if (req === requestIdRef.current) {
          setIsUpvoted(prev.isUpvoted);
          setIsDownvoted(prev.isDownvoted);
          setUpvotes(prev.upvotes);
          setDownvotes(prev.downvotes);
          onError?.(e.message);
        }
      }
    };

    const upColor = isUpvoted ? "#00BA7C" : colors.gray;
    const downColor = isDownvoted ? "#F91880" : colors.gray;

    return (
      <View style={styles.actionBar}>
        <Animated.View style={{ transform: [{ scale: upScale }] }}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleUpvote}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isUpvoted ? "thumbs-up" : "thumbs-up-outline"}
              size={20}
              color={upColor}
            />
            <Text style={[styles.actionCount, { color: upColor }]}>
              {fmt(upvotes)}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: downScale }] }}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDownvote}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isDownvoted ? "thumbs-down" : "thumbs-down-outline"}
              size={20}
              color={downColor}
            />
            <Text style={[styles.actionCount, { color: downColor }]}>
              {fmt(downvotes)}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  },
);

const PostFlagButton = memo(
  ({ postId, initialFlags = 0, initialUserFlagged = false, onError }) => {
    const [isFlagged, setIsFlagged] = useState(initialUserFlagged);
    const [flags, setFlags] = useState(initialFlags || 0);
    const requestIdRef = useRef(0);
    const flagScale = useRef(new Animated.Value(1)).current;

    const animate = (v) => {
      Animated.sequence([
        Animated.timing(v, {
          toValue: 0.9,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(v, { toValue: 1, duration: 90, useNativeDriver: true }),
      ]).start();
    };

    const handleFlag = async () => {
      animate(flagScale);
      const req = ++requestIdRef.current;
      const prev = { isFlagged, flags };

      if (isFlagged) {
        setIsFlagged(false);
        setFlags((v) => Math.max(0, v - 1));
      } else {
        setIsFlagged(true);
        setFlags((v) => v + 1);
      }

      try {
        const res = await interactWithPost(postId, "flag");
        if (req === requestIdRef.current && res?.success) {
          setFlags(Number(res.details?.new_flags || 0));
        }
      } catch (e) {
        if (req === requestIdRef.current) {
          setIsFlagged(prev.isFlagged);
          setFlags(prev.flags);
          onError?.(e.message);
        }
      }
    };

    const isActive = isFlagged;
    const iconColor = isActive ? "#B91C1C" : "#DC2626";

    return (
      <Animated.View style={{ transform: [{ scale: flagScale }] }}>
        <TouchableOpacity
          style={[
            styles.prominentFlagButton,
            {
              backgroundColor: isActive ? "#FEE2E2" : "#FEE2E2",
              borderColor: isActive ? "#FCA5A5" : "#FECACA",
            },
          ]}
          onPress={handleFlag}
          activeOpacity={0.75}
        >
          <Ionicons
            name={isFlagged ? "flag" : "flag-outline"}
            size={16}
            color={iconColor}
          />
          <Text style={[styles.prominentFlagText, { color: iconColor }]}>
            Flag
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  },
);

export default function PostDetailsScreen({ route }) {
  const { colors } = useTheme();
  const postId = route?.params?.postId;
  const focusComment = route?.params?.focusComment === true;

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [categoryModal, setCategoryModal] = useState({
    visible: false,
    category: "General",
    score: 0,
  });
  const [locationModal, setLocationModal] = useState({
    visible: false,
    lat: 0,
    lon: 0,
  });
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [mediaWidth, setMediaWidth] = useState(SCREEN_WIDTH - 88);
  const scrollRef = useRef(null);
  const commentInputRef = useRef(null);
  const commentsYRef = useRef(0);
  const didAutoFocusRef = useRef(false);

  const loadPost = useCallback(async () => {
    if (!postId) {
      setError("Missing post ID");
      setIsLoading(false);
      return;
    }

    try {
      setError("");
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await response.json();
      if (!response.ok || !data?.success || !data?.details?.post) {
        setPost(null);
        setError("Post details not available.");
        return;
      }
      setPost(data.details.post);
    } catch {
      setPost(null);
      setError("Failed to load post details.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [postId]);

  useEffect(() => {
    setIsLoading(true);
    loadPost();
  }, [loadPost]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadPost();
  }, [loadPost]);

  const submitComment = useCallback(async () => {
    const content = commentText.trim();
    if (!content || !postId || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      setError("");
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        setError("Unable to add comment.");
        return;
      }

      setCommentText("");
      await loadPost();
    } catch {
      setError("Unable to add comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  }, [commentText, isSubmittingComment, loadPost, postId]);

  const mediaItems = useMemo(() => post?.media_items || [], [post]);
  const replies = useMemo(() => post?.replies || [], [post]);

  const showCategoryInfo = useCallback(() => {
    if (!post) return;
    setCategoryModal({
      visible: true,
      category: post.event_category || "General",
      score: Number(post.credibility_score || 0) || 0,
    });
  }, [post]);

  const showLocationInfo = useCallback(() => {
    if (!post) return;
    setLocationModal({
      visible: true,
      lat: Number(post.location_lat || 0),
      lon: Number(post.location_lon || 0),
    });
  }, [post]);

  const onMediaScroll = useCallback(
    (event) => {
      if (!mediaWidth) return;
      const x = event.nativeEvent.contentOffset.x;
      const index = Math.round(x / mediaWidth);
      setCurrentMediaIndex(index);
    },
    [mediaWidth],
  );

  useEffect(() => {
    setCurrentMediaIndex(0);
  }, [postId, mediaItems.length]);

  useEffect(() => {
    didAutoFocusRef.current = false;
  }, [postId, focusComment]);

  useEffect(() => {
    if (!focusComment || isLoading || !post || didAutoFocusRef.current) return;
    didAutoFocusRef.current = true;

    const t = setTimeout(() => {
      const y = Math.max(0, commentsYRef.current - 12);
      scrollRef.current?.scrollTo({ y, animated: true });
      commentInputRef.current?.focus();
    }, 220);

    return () => clearTimeout(t);
  }, [focusComment, isLoading, post]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.gray }]}>
              Loading post details...
            </Text>
          </View>
        ) : null}

        {!isLoading && error ? (
          <View
            style={[
              styles.errorCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.errorText, { color: "#d32f2f" }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {!isLoading && post ? (
          <>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.postRow}>
                <TouchableOpacity
                  style={[
                    styles.avatarPlaceholder,
                    {
                      backgroundColor:
                        credibilityColor(Number(post.credibility_score || 0)) +
                        "20",
                      borderWidth: 2,
                      borderColor:
                        credibilityColor(Number(post.credibility_score || 0)) +
                        "50",
                    },
                  ]}
                  onPress={showCategoryInfo}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={categoryIcon(post.event_category)}
                    size={20}
                    color={categoryColor(post.event_category)}
                  />
                  <View
                    style={[
                      styles.credibilityDot,
                      {
                        backgroundColor: credibilityColor(
                          Number(post.credibility_score || 0),
                        ),
                      },
                    ]}
                  />
                </TouchableOpacity>

                <View style={styles.postBody}>
                  <View style={styles.headerRow}>
                    <View style={styles.headerMetaRow}>
                      <Text style={[styles.category, { color: colors.text }]}>
                        {post.event_category || "General"}
                      </Text>
                      <Text style={[styles.dot, { color: colors.gray }]}>
                        ·
                      </Text>
                      <Text style={[styles.timeText, { color: colors.gray }]}>
                        {formatTime(post.created_at)}
                      </Text>
                    </View>

                    <PostFlagButton
                      postId={post.id}
                      initialFlags={post.flags || 0}
                      initialUserFlagged={post.user_flagged || false}
                      onError={(msg) => Alert.alert("Interaction Error", msg)}
                    />
                  </View>

                  <Text style={[styles.contentText, { color: colors.text }]}>
                    {post.content}
                  </Text>

                  <TouchableOpacity
                    onPress={showLocationInfo}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.locationPill,
                        {
                          backgroundColor: colors.primary + "10",
                        },
                      ]}
                    >
                      <Ionicons
                        name="location"
                        size={12}
                        color={colors.primary}
                      />
                      <Text
                        style={[styles.locationText, { color: colors.primary }]}
                      >
                        {Number(post.location_lat || 0).toFixed(4)},{" "}
                        {Number(post.location_lon || 0).toFixed(4)}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={12}
                        color={colors.primary}
                        style={{ opacity: 0.6 }}
                      />
                    </View>
                  </TouchableOpacity>

                  {mediaItems.length > 0 ? (
                    <View
                      style={styles.mediaTopWrap}
                      onLayout={(e) => {
                        const w = e.nativeEvent.layout.width;
                        if (w > 0) setMediaWidth(w);
                      }}
                    >
                      <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={onMediaScroll}
                        scrollEventThrottle={16}
                      >
                        {mediaItems.map((media, idx) => {
                          const url = mediaUrlOf(media);
                          const type = mediaTypeOf(media);
                          const isImage = type.includes("image");
                          return (
                            <View
                              key={`${url || "media"}-${idx}`}
                              style={[styles.mediaSlide, { width: mediaWidth }]}
                            >
                              {isImage && !!url ? (
                                <Image
                                  source={{ uri: url }}
                                  style={styles.mediaImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View
                                  style={[
                                    styles.mediaFallback,
                                    {
                                      backgroundColor: colors.background,
                                      borderColor: colors.border,
                                    },
                                  ]}
                                >
                                  <Ionicons
                                    name="videocam-outline"
                                    size={20}
                                    color={colors.primary}
                                  />
                                  <Text
                                    style={[
                                      styles.mediaType,
                                      { color: colors.gray },
                                    ]}
                                  >
                                    {type}
                                  </Text>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </ScrollView>

                      {mediaItems.length > 1 ? (
                        <View style={styles.mediaCounter}>
                          <Text style={styles.mediaCounterText}>
                            {Math.min(currentMediaIndex + 1, mediaItems.length)}
                            /{mediaItems.length}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  <PostInteractionBar
                    postId={post.id}
                    initialUpvotes={post.upvotes || 0}
                    initialDownvotes={post.downvotes || 0}
                    colors={colors}
                    onError={(msg) => Alert.alert("Interaction Error", msg)}
                  />
                </View>
              </View>

              {post.parent_post ? (
                <View
                  style={[
                    styles.parentWrap,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.parentLabel, { color: colors.gray }]}>
                    Parent Post
                  </Text>
                  <Text
                    style={[styles.parentText, { color: colors.text }]}
                    numberOfLines={3}
                  >
                    {post.parent_post.content}
                  </Text>
                </View>
              ) : null}
            </View>

            <View
              style={[
                styles.commentsCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onLayout={(event) => {
                commentsYRef.current = event.nativeEvent.layout.y;
              }}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Comments ({replies.length})
              </Text>
              <View style={styles.commentComposerRow}>
                <TextInput
                  ref={commentInputRef}
                  style={[
                    styles.commentInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Write a comment"
                  placeholderTextColor={colors.gray}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
                <TouchableOpacity
                  style={[
                    styles.commentBtn,
                    {
                      backgroundColor: isSubmittingComment
                        ? colors.gray
                        : colors.primary,
                    },
                  ]}
                  onPress={submitComment}
                  disabled={isSubmittingComment || !commentText.trim()}
                >
                  {isSubmittingComment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              {replies.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.gray }]}>
                  No comments yet.
                </Text>
              ) : (
                replies.map((reply) => (
                  <View
                    key={reply.id}
                    style={[
                      styles.replyCard,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.contentText, { color: colors.text }]}>
                      {reply.content}
                    </Text>
                    <Text style={[styles.replyMeta, { color: colors.gray }]}>
                      {formatTime(reply.created_at)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={categoryModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setCategoryModal((prev) => ({ ...prev, visible: false }))
        }
      >
        <TouchableOpacity
          style={styles.infoOverlay}
          activeOpacity={1}
          onPress={() =>
            setCategoryModal((prev) => ({ ...prev, visible: false }))
          }
        >
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={styles.credibilityCircleContainer}>
              <View
                style={[
                  styles.credibilityCircle,
                  {
                    borderColor: categoryColor(categoryModal.category),
                    backgroundColor:
                      categoryColor(categoryModal.category) + "15",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.credibilityPercentage,
                    { color: categoryColor(categoryModal.category) },
                  ]}
                >
                  {Math.round(categoryModal.score * 100)}%
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.credibilityLabelBadge,
                {
                  backgroundColor: categoryColor(categoryModal.category) + "20",
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={categoryColor(categoryModal.category)}
              />
              <Text
                style={[
                  styles.credibilityLabel,
                  { color: categoryColor(categoryModal.category) },
                ]}
              >
                High Credibility
              </Text>
            </View>

            <Text
              style={[styles.credibilityDescription, { color: colors.gray }]}
            >
              This score is calculated using AI analysis of media authenticity,
              content verification, and community feedback.
            </Text>

            <Text style={[styles.credibilityHint, { color: colors.gray }]}>
              Tap anywhere to dismiss
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={locationModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setLocationModal((prev) => ({ ...prev, visible: false }))
        }
      >
        <TouchableOpacity
          style={styles.infoOverlay}
          activeOpacity={1}
          onPress={() =>
            setLocationModal((prev) => ({ ...prev, visible: false }))
          }
        >
          <View
            style={[
              styles.locationInfoCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <View
              style={[
                styles.locationIconCircle,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons name="location" size={30} color={colors.primary} />
            </View>

            <Text style={[styles.locationTitle, { color: colors.text }]}>
              Incident Coordinates
            </Text>

            <View
              style={[
                styles.coordinatesContainer,
                { backgroundColor: colors.border + "50" },
              ]}
            >
              <View style={styles.coordinateRow}>
                <Text style={[styles.coordinateLabel, { color: colors.gray }]}>
                  Latitude
                </Text>
                <Text style={[styles.coordinateValue, { color: colors.text }]}>
                  {locationModal.lat.toFixed(6)}°
                </Text>
              </View>
              <View
                style={[
                  styles.coordinateDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.coordinateRow}>
                <Text style={[styles.coordinateLabel, { color: colors.gray }]}>
                  Longitude
                </Text>
                <Text style={[styles.coordinateValue, { color: colors.text }]}>
                  {locationModal.lon.toFixed(6)}°
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.credibilityHint,
                { color: colors.gray, marginTop: 16 },
              ]}
            >
              Tap anywhere to dismiss
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 28 },
  loadingWrap: { alignItems: "center", paddingVertical: 20, gap: 8 },
  loadingText: { fontSize: 13 },
  errorCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    padding: 12,
  },
  postRow: {
    flexDirection: "row",
    gap: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  credibilityDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  postBody: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    paddingRight: 10,
  },
  mediaTopWrap: {
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  mediaSlide: {
    borderRadius: 12,
    overflow: "hidden",
  },
  mediaImage: { width: "100%", height: 220 },
  mediaFallback: {
    height: 220,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  mediaType: { fontSize: 12 },
  mediaCounter: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mediaCounterText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  category: { fontSize: 14, fontWeight: "700" },
  dot: { fontSize: 12 },
  contentText: { fontSize: 14, lineHeight: 20 },
  locationPill: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  locationText: { fontSize: 11, fontWeight: "600" },
  timeText: { fontSize: 12 },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 20,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  prominentFlagButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  prominentFlagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  parentWrap: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  parentLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  parentText: { fontSize: 13, lineHeight: 18 },
  commentsCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  commentComposerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 42,
    maxHeight: 100,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  commentBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 13 },
  replyCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  replyMeta: { fontSize: 11, marginTop: 6 },
  errorText: { fontSize: 14, fontWeight: "600" },
  infoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  infoCard: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  credibilityCircleContainer: {
    marginBottom: 14,
  },
  credibilityCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  credibilityPercentage: {
    fontSize: 22,
    fontWeight: "800",
  },
  credibilityLabelBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  credibilityLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  credibilityDescription: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  credibilityHint: {
    fontSize: 12,
  },
  locationInfoCard: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  locationIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  coordinatesContainer: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  coordinateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  coordinateLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  coordinateValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  coordinateDivider: {
    height: 1,
  },
});
