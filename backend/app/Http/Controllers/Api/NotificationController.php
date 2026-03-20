<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = Notification::query()
            ->select(['id', 'user_email', 'type', 'titre', 'message', 'data', 'est_lue', 'created_at'])
            ->where('user_email', $request->user()->email)
            ->latest()
            ->paginate(20);

        return response()->json($notifications);
    }

    public function apercu(Request $request): JsonResponse
    {
        $email = $request->user()->email;

        $items = Notification::query()
            ->select(['id', 'user_email', 'type', 'titre', 'message', 'data', 'est_lue', 'created_at'])
            ->where('user_email', $email)
            ->latest()
            ->limit(5)
            ->get();

        $unreadCount = Notification::query()
            ->where('user_email', $email)
            ->where('est_lue', false)
            ->count();

        return response()->json([
            'unread_count' => $unreadCount,
            'items' => $items,
        ]);
    }

    public function nonLues(Request $request): JsonResponse
    {
        $count = Notification::query()
            ->where('user_email', $request->user()->email)
            ->where('est_lue', false)
            ->count();

        return response()->json(['count' => $count]);
    }

    public function marquerLue(Request $request, Notification $notification): JsonResponse
    {
        abort_if($notification->user_email !== $request->user()->email, 403);

        $notification->update(['est_lue' => true]);

        return response()->json($notification);
    }

    public function marquerToutesLues(Request $request): JsonResponse
    {
        Notification::query()
            ->where('user_email', $request->user()->email)
            ->where('est_lue', false)
            ->update(['est_lue' => true]);

        return response()->json(['message' => 'Toutes les notifications sont marquees lues']);
    }
}
