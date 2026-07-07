const BASE_URL = 'http://localhost:5000/api';

// Helper to get auth headers
const getHeaders = (isMultipart = false) => {
  const token = localStorage.getItem('chatbox_token');
  const headers = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Response helper
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMsg = 'Something went wrong';
    try {
      const data = await response.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return response.json();
};

export const api = {
  // Auth
  register: async (username, email, password) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, email, password }),
    });
    return handleResponse(res);
  },

  login: async (emailOrUsername, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ emailOrUsername, password }),
    });
    return handleResponse(res);
  },

  getMe: async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Users
  searchUsers: async (query = '') => {
    const res = await fetch(`${BASE_URL}/users?search=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  updateProfile: async (profileData) => {
    const res = await fetch(`${BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profileData),
    });
    return handleResponse(res);
  },

  updateAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch(`${BASE_URL}/users/avatar`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    });
    return handleResponse(res);
  },

  // Messages
  getMessages: async (id, isGroup = false) => {
    const res = await fetch(`${BASE_URL}/messages/${id}?isGroup=${isGroup}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  sendMessage: async ({ content, chatType, receiverId, groupId, mediaFile }) => {
    let body;
    let isMultipart = false;

    if (mediaFile) {
      isMultipart = true;
      const formData = new FormData();
      formData.append('chatType', chatType);
      if (content) formData.append('content', content);
      if (receiverId) formData.append('receiverId', receiverId);
      if (groupId) formData.append('groupId', groupId);
      formData.append('media', mediaFile);
      body = formData;
    } else {
      body = JSON.stringify({ content, chatType, receiverId, groupId });
    }

    const res = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: getHeaders(isMultipart),
      body,
    });
    return handleResponse(res);
  },

  markAsRead: async (id, isGroup = false) => {
    const res = await fetch(`${BASE_URL}/messages/seen/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ isGroup }),
    });
    return handleResponse(res);
  },

  // Groups
  createGroup: async ({ name, description, members, avatarFile }) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description || '');
    formData.append('members', JSON.stringify(members));
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    const res = await fetch(`${BASE_URL}/groups`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    });
    return handleResponse(res);
  },

  getGroups: async () => {
    const res = await fetch(`${BASE_URL}/groups`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getGroupDetails: async (id) => {
    const res = await fetch(`${BASE_URL}/groups/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  addMembers: async (groupId, memberIds) => {
    const res = await fetch(`${BASE_URL}/groups/${groupId}/add`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ memberIds }),
    });
    return handleResponse(res);
  },

  kickMember: async (groupId, memberId) => {
    const res = await fetch(`${BASE_URL}/groups/${groupId}/kick`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ memberId }),
    });
    return handleResponse(res);
  },

  leaveGroup: async (groupId) => {
    const res = await fetch(`${BASE_URL}/groups/${groupId}/leave`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // Reports
  createReport: async ({ reason, reportedUserId, reportedGroupId, reportedMessageId }) => {
    const res = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason, reportedUserId, reportedGroupId, reportedMessageId }),
    });
    return handleResponse(res);
  },

  blockUser: async (userId) => {
    const res = await fetch(`${BASE_URL}/users/block/${userId}`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  unblockUser: async (userId) => {
    const res = await fetch(`${BASE_URL}/users/unblock/${userId}`, {
      method: 'PUT',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  deleteMessage: async (messageId, type) => {
    const res = await fetch(`${BASE_URL}/messages/${messageId}?type=${type}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  deleteAccount: async () => {
    const res = await fetch(`${BASE_URL}/users/profile`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },
};
