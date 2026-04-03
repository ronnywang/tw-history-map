<?php

class IndexController extends MiniEngine_Controller
{
    public function indexAction()
    {
        $this->view->app_name = getenv('APP_NAME');
        $this->view->eras = DB::query("SELECT id, name, name_en, start_year, end_year FROM eras ORDER BY sort_order");
    }

    public function robotsAction()
    {
        header('Content-Type: text/plain');
        echo "#\n";
        return $this->noview();
    }
}
