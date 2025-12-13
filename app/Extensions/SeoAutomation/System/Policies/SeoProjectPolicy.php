<?php

namespace App\Extensions\SeoAutomation\System\Policies;

use App\Extensions\SeoAutomation\System\Models\SeoProject;
use App\Models\User;

class SeoProjectPolicy
{
    /**
     * Determine if the user can view the project.
     */
    public function view(User $user, SeoProject $project): bool
    {
        return $user->id === $project->user_id || $user->isAdmin();
    }

    /**
     * Determine if the user can update the project.
     */
    public function update(User $user, SeoProject $project): bool
    {
        return $user->id === $project->user_id;
    }

    /**
     * Determine if the user can delete the project.
     */
    public function delete(User $user, SeoProject $project): bool
    {
        return $user->id === $project->user_id;
    }
}
